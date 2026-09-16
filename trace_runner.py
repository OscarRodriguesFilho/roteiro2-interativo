"""Capture actual Python trace events; consumed by the browser worker and tests."""
import contextlib
import io
import json
import sys
import tempfile
from pathlib import Path


def record_execution(code, expression, mode="2"):
    filename = f"roteiro{mode}-enxuto.py"
    namespace = {"__name__": "roteiro_visual"}
    frames = []
    output = io.StringIO()
    source_lines = code.splitlines()
    batch_tokens = []
    char_position = None
    token_index = None
    nodes = {}
    node_results = {}
    symbol_table = None
    temporary = None

    def remember(value):
        node_class = namespace.get("Node")
        if isinstance(node_class, type) and isinstance(value, node_class):
            if id(value) not in nodes:
                nodes[id(value)] = value
            for child in getattr(value, "children", []):
                if id(child) not in nodes:
                    remember(child)
        elif isinstance(value, (list, tuple)):
            for item in value[:150]:
                if not isinstance(item, (list, tuple)):
                    remember(item)

    def value_repr(value):
        if value is None or isinstance(value, (str, int, float, bool)):
            return repr(value)[:250]
        if isinstance(value, (tuple, list)):
            return repr(value)[:250]
        if type(value).__name__ == "Token":
            return f"Token({getattr(value, 'type', None)!r}, {getattr(value, 'value', None)!r})"
        return f"<{type(value).__name__}>"

    def trace(frame, event, arg):
        nonlocal batch_tokens, char_position, token_index, symbol_table
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
                if mode in ("4", "5"):
                    for value in cursor.f_locals.values():
                        remember(value)
                        if type(value).__name__ == "SymbolTable":
                            symbol_table = value
            cursor = cursor.f_back
        token = getattr(lexer, "next", None)
        position = getattr(lexer, "position", None)
        token_data = None if token is None else {"type": getattr(token, "type", None), "value": value_repr(getattr(token, "value", None))}
        phase = "coordenação"
        if mode == "1":
            if frame.f_code.co_name == "tokenizar":
                phase = "tokenização"
                char_position = frame.f_locals.get("posicao", char_position)
                current_tokens = frame.f_locals.get("tokens", [])
                batch_tokens = [{"type": item[0], "value": value_repr(item[1])} for item in current_tokens if isinstance(item, (tuple, list)) and len(item) == 2]
            elif frame.f_code.co_name == "avaliar":
                phase = "avaliação"
                token_index = frame.f_locals.get("posicao", token_index)
            position = char_position
            if isinstance(token_index, int) and 0 <= token_index < len(batch_tokens):
                token_data = batch_tokens[token_index]
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
        active_node = None
        tree = []
        if mode in ("4", "5"):
            remember(arg if event == "return" else None)
            if id(obj) in nodes:
                active_node = str(id(obj))
                local_values["self.value"] = value_repr(getattr(obj, "value", None))
                if event == "return" and frame.f_code.co_name == "evaluate":
                    node_results[id(obj)] = value_repr(arg)
            for key, node in nodes.items():
                tree.append({"id": str(key), "kind": type(node).__name__,
                             "value": value_repr(getattr(node, "value", None)),
                             "children": [str(id(child)) for child in getattr(node, "children", [])],
                             "result": node_results.get(key)})
            phase = "avaliação da AST" if any("evaluate" in name for name in chain) else ("retorno à main" if node_results else "construção da AST")
            if "PrePro.filter" in chain:
                phase = "pré-processamento"
        if type(obj).__name__ == "Token":
            local_values["self.type"] = value_repr(getattr(obj, "type", None))
            local_values["self.value"] = value_repr(getattr(obj, "value", None))
        frames.append({
            "line": line, "event": event, "method": frame.f_code.co_qualname,
            "action": action, "stack": list(reversed(chain)), "locals": local_values,
            "position": position, "token": token_data,
            "tokens": list(batch_tokens), "token_index": token_index, "phase": phase,
            "output": output.getvalue(),
            "source": getattr(lexer, "source", None),
            "tree": tree, "active_node": active_node,
            "symbols": {name: value_repr(getattr(var, "value", None)) for name, var in getattr(symbol_table, "table", {}).items()},
        })
        return trace

    old_argv = sys.argv
    error = None
    try:
        with contextlib.redirect_stdout(output):
            exec(compile(code, filename, "exec"), namespace)
            sys.argv = [filename, expression]
            if mode == "5":
                temporary = tempfile.TemporaryDirectory(prefix="roteiro5-")
                program = Path(temporary.name) / "programa.go"
                program.write_text(expression, encoding="utf-8")
                sys.argv = [filename, str(program)]
            sys.settrace(trace)
            namespace["main"]()
    except Exception as exc:
        error = str(exc)
    finally:
        sys.settrace(None)
        sys.argv = old_argv
        if temporary is not None:
            temporary.cleanup()
    return {"frames": frames, "output": output.getvalue(), "error": error}
