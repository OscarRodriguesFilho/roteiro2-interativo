"""Capture actual Python trace events; consumed by the browser worker and tests."""
import contextlib
import io
import json
import sys


def record_execution(code, expression):
    filename = "roteiro2-enxuto.py"
    namespace = {"__name__": "roteiro2_visual"}
    frames = []
    output = io.StringIO()
    source_lines = code.splitlines()

    def value_repr(value):
        if value is None or isinstance(value, (str, int, float, bool)):
            return repr(value)[:250]
        if type(value).__name__ == "Token":
            return f"Token({getattr(value, 'type', None)!r}, {getattr(value, 'value', None)!r})"
        return f"<{type(value).__name__}>"

    def trace(frame, event, arg):
        if frame.f_code.co_filename != filename:
            return None
        if len(frames) >= 5000:
            raise RuntimeError("Limite de 5.000 passos atingido. Reduza a entrada ou revise os laços.")
        if event not in ("call", "line", "return", "exception"):
            return trace
        chain = []
        cursor = frame
        lexer = getattr(namespace.get("Parser"), "lexer", None)
        while cursor:
            if cursor.f_code.co_filename == filename:
                chain.append(cursor.f_code.co_qualname)
                obj = cursor.f_locals.get("self")
                if type(obj).__name__ == "Lexer":
                    lexer = obj
            cursor = cursor.f_back
        token = getattr(lexer, "next", None)
        line = frame.f_lineno
        statement = source_lines[line - 1] if 0 < line <= len(source_lines) else ""
        action = statement.partition("  # ")[2] or statement.strip()
        if event == "call":
            action = "Entrar em " + frame.f_code.co_qualname + ". Os argumentos já estão disponíveis."
        elif event == "return":
            action = "Devolver " + value_repr(arg) + " e retornar ao chamador (ou propagar uma exceção pendente)."
        elif event == "exception":
            action = str(arg[1])
        local_values = {k: value_repr(v) for k, v in frame.f_locals.items() if not k.startswith("__")}
        obj = frame.f_locals.get("self")
        if type(obj).__name__ == "Token":
            local_values["self.type"] = value_repr(getattr(obj, "type", None))
            local_values["self.value"] = value_repr(getattr(obj, "value", None))
        frames.append({
            "line": line, "event": event, "method": frame.f_code.co_qualname,
            "action": action, "stack": list(reversed(chain)), "locals": local_values,
            "position": getattr(lexer, "position", None),
            "token": None if token is None else {"type": getattr(token, "type", None), "value": value_repr(getattr(token, "value", None))},
            "output": output.getvalue(),
        })
        return trace

    old_argv = sys.argv
    error = None
    try:
        with contextlib.redirect_stdout(output):
            exec(compile(code, filename, "exec"), namespace)
            sys.argv = [filename, expression]
            sys.settrace(trace)
            namespace["main"]()
    except Exception as exc:
        error = str(exc)
    finally:
        sys.settrace(None)
        sys.argv = old_argv
    return {"frames": frames, "output": output.getvalue(), "error": error}
