import sys


class Token:
    def __init__(self, type, value):
        self.type = type  # Guarda a categoria do token.
        self.value = value  # Guarda o número, nome ou símbolo.


class Lexer:
    SYMBOLS = {"+": "PLUS", "-": "MINUS", "*": "MULT", "/": "DIV",
               "(": "OPEN_PAR", ")": "CLOSE_PAR"}

    def __init__(self, source):
        self.source = source  # Preserva o texto recebido.
        self.position = 0  # Aponta para o próximo caractere.
        self.next = None  # O primeiro token será preparado por run().

    def select_next(self):
        while self.position < len(self.source) and self.source[self.position].isspace():  # Pula espaços entre tokens.
            self.position += 1
        if self.position == len(self.source):
            self.next = Token("EOF", "")  # Marca o fim da entrada.
            return
        char = self.source[self.position]
        if char in self.SYMBOLS:
            self.position += 1  # Consome um símbolo.
            self.next = Token(self.SYMBOLS[char], char)
        elif char in "0123456789":
            start = self.position  # Marca o começo do número.
            while self.position < len(self.source) and self.source[self.position] in "0123456789":
                self.position += 1  # Reúne todos os dígitos consecutivos.
            self.next = Token("INT", int(self.source[start:self.position]))
        else:
            raise Exception(f"[Lexer] Símbolo inválido {char!r} na posição {self.position}")


class Parser:
    lexer = None

    @staticmethod
    def parse_expression():
        result = Parser.parse_term()  # Resolve primeiro o nível de multiplicações.
        while Parser.lexer.next.type in ("PLUS", "MINUS"):
            operator = Parser.lexer.next.value  # Guarda o operador antes de avançar.
            Parser.lexer.select_next()
            right = Parser.parse_term()  # Lê um termo completo do lado direito.
            result = result + right if operator == "+" else result - right  # Acumula da esquerda para a direita.
        return result

    @staticmethod
    def parse_term():
        result = Parser.parse_factor()  # Obtém o primeiro operando.
        while Parser.lexer.next.type in ("MULT", "DIV"):
            operator = Parser.lexer.next.value
            Parser.lexer.select_next()
            right = Parser.parse_factor()  # Lê o próximo operando.
            if operator == "/" and right == 0:
                raise Exception("[Semantic] Divisão por zero")
            result = result * right if operator == "*" else result // right  # Divisão inteira do Python.
        return result

    @staticmethod
    def parse_factor():
        token = Parser.lexer.next  # Escolhe uma alternativa da gramática.
        if token.type == "INT":
            Parser.lexer.select_next()
            return token.value  # Um inteiro já é um fator.
        if token.type in ("PLUS", "MINUS"):
            Parser.lexer.select_next()
            child = Parser.parse_factor()  # Recursão permite vários sinais seguidos.
            return child if token.value == "+" else -child
        if token.type == "OPEN_PAR":
            Parser.lexer.select_next()
            result = Parser.parse_expression()  # Reinicia a expressão dentro dos parênteses.
            if Parser.lexer.next.type != "CLOSE_PAR":
                raise Exception("[Parser] Esperado ')'")
            Parser.lexer.select_next()  # Consome o fechamento, não um operando.
            return result
        raise Exception(f"[Parser] Esperado fator, encontrado {token.type}")

    @staticmethod
    def run(code):
        Parser.lexer = Lexer(code)
        Parser.lexer.select_next()  # Prepara o primeiro token apenas uma vez.
        result = Parser.parse_expression()
        if Parser.lexer.next.type != "EOF":
            raise Exception(f"[Parser] Esperado EOF, encontrado {Parser.lexer.next.type}")
        return result


def main():
    if len(sys.argv) != 2:
        raise Exception("[Main] Passe a expressão entre aspas.")
    print(Parser.run(sys.argv[1]))  # O Parser já devolve um número.


if __name__ == "__main__":
    main()

