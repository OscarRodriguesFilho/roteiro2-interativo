import sys
from abc import ABC, abstractmethod


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


class Node(ABC):
    def __init__(self, value, children):
        self.value = value  # Guarda o literal, operador ou nome.
        self.children = children  # Liga este nó aos seus operandos.

    @abstractmethod
    def evaluate(self):
        pass  # Define o contrato; Node não pode ser instanciada.


class IntVal(Node):
    def evaluate(self):
        return self.value  # A folha devolve seu inteiro.


class UnOp(Node):
    def evaluate(self):
        child = self.children[0].evaluate()  # Primeiro avalia o único filho.
        if self.value == "+":
            return child
        if self.value == "-":
            return -child
        raise Exception("[Semantic] Operador unário inválido")


class BinOp(Node):
    def evaluate(self):
        left = self.children[0].evaluate()  # Avalia o operando esquerdo.
        right = self.children[1].evaluate()  # Depois avalia o operando direito.
        if self.value == "+":
            return left + right
        if self.value == "-":
            return left - right  # A ordem dos filhos importa.
        if self.value == "*":
            return left * right
        if self.value == "/":
            if right == 0:
                raise Exception("[Semantic] Divisão por zero")
            return left // right  # Divisão inteira do Python.
        raise Exception("[Semantic] Operador binário inválido")


class Parser:
    lexer = None

    @staticmethod
    def parse_expression():
        result = Parser.parse_term()  # Obtém a subárvore do primeiro termo.
        while Parser.lexer.next.type in ("PLUS", "MINUS"):
            operator = Parser.lexer.next.value  # Guarda o operador antes de avançar.
            Parser.lexer.select_next()
            right = Parser.parse_term()  # Constrói a subárvore do lado direito.
            result = BinOp(operator, [result, right])  # Liga as subárvores sem calcular.
        return result

    @staticmethod
    def parse_term():
        result = Parser.parse_factor()  # Obtém o primeiro operando.
        while Parser.lexer.next.type in ("MULT", "DIV"):
            operator = Parser.lexer.next.value
            Parser.lexer.select_next()
            right = Parser.parse_factor()  # Lê o próximo operando.
            result = BinOp(operator, [result, right])  # O cálculo fica para evaluate().
        return result

    @staticmethod
    def parse_factor():
        token = Parser.lexer.next  # Escolhe uma alternativa da gramática.
        if token.type == "INT":
            Parser.lexer.select_next()
            return IntVal(token.value, [])  # Constrói uma folha.
        if token.type in ("PLUS", "MINUS"):
            Parser.lexer.select_next()
            child = Parser.parse_factor()  # Recursão permite vários sinais seguidos.
            return UnOp(token.value, [child])  # Um operador, um filho.
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
    root = Parser.run(sys.argv[1])  # Primeiro monta toda a AST.
    print(root.evaluate())  # Só agora a árvore calcula o resultado.


if __name__ == "__main__":
    main()

