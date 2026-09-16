import sys
import re
from abc import ABC, abstractmethod


class PrePro:
    @staticmethod
    def filter(code):
        return re.sub(r"//[^\n]*", "", code)  # Remove o comentário sem remover sua quebra de linha.


class Variable:
    def __init__(self, value):
        self.value = value  # Wrapper que poderá receber tipo e outras informações.


class SymbolTable:
    def __init__(self):
        self.table = {}  # Associa cada nome a um objeto Variable.

    def get(self, name):
        if name not in self.table:
            raise Exception(f"[Semantic] Variável inexistente: {name}")
        return self.table[name].value  # Consulta o valor atual.

    def set(self, name, value):
        self.table[name] = Variable(value)  # Cria ou atualiza a variável.


class Token:
    def __init__(self, type, value):
        self.type = type  # Guarda a categoria do token.
        self.value = value  # Guarda o número, nome ou símbolo.


class Lexer:
    SYMBOLS = {"+": "PLUS", "-": "MINUS", "*": "MULT", "/": "DIV",
               "(": "OPEN_PAR", ")": "CLOSE_PAR", "=": "ASSIGN", "\n": "END"}

    def __init__(self, source):
        self.source = source  # Preserva o texto recebido.
        self.position = 0  # Aponta para o próximo caractere.
        self.next = None  # O primeiro token será preparado por run().

    def select_next(self):
        while self.position < len(self.source) and self.source[self.position] in " \t\r":  # Pula espaços, mas preserva a quebra de linha.
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
        elif char in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ":
            start = self.position  # Identifier começa obrigatoriamente por uma letra.
            allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"
            while self.position < len(self.source) and self.source[self.position] in allowed:
                self.position += 1
            name = self.source[start:self.position]
            self.next = Token("PRINT" if name == "Println" else "IDEN", name)  # Separa a palavra reservada.
        else:
            raise Exception(f"[Lexer] Símbolo inválido {char!r} na posição {self.position}")


class Node(ABC):
    def __init__(self, value, children):
        self.value = value  # Guarda o literal, operador ou nome.
        self.children = children  # Liga este nó aos seus operandos.

    @abstractmethod
    def evaluate(self, st):
        pass  # Define o contrato; Node não pode ser instanciada.


class IntVal(Node):
    def evaluate(self, st):
        return self.value  # A folha devolve seu inteiro.


class UnOp(Node):
    def evaluate(self, st):
        child = self.children[0].evaluate(st)  # Primeiro avalia o único filho.
        if self.value == "+":
            return child
        if self.value == "-":
            return -child
        raise Exception("[Semantic] Operador unário inválido")


class BinOp(Node):
    def evaluate(self, st):
        left = self.children[0].evaluate(st)  # Avalia o operando esquerdo.
        right = self.children[1].evaluate(st)  # Depois avalia o operando direito.
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


class Identifier(Node):
    def evaluate(self, st):
        return st.get(self.value)  # O nome está no nó; o valor, na tabela.


class Assignment(Node):
    def evaluate(self, st):
        value = self.children[1].evaluate(st)  # Calcula o lado direito usando a tabela atual.
        st.set(self.children[0].value, value)  # Não avalia o Identifier do lado esquerdo.


class Print(Node):
    def evaluate(self, st):
        print(self.children[0].evaluate(st))  # Imprime e não retorna um valor.


class Block(Node):
    def evaluate(self, st):
        for child in self.children:
            child.evaluate(st)  # Executa as instruções na ordem, compartilhando a tabela.


class NoOp(Node):
    def evaluate(self, st):
        pass  # Uma linha vazia não faz nada.


class Parser:
    lexer = None

    @staticmethod
    def expect(kind):
        if Parser.lexer.next.type != kind:
            raise Exception(f"[Parser] Esperado {kind}, encontrado {Parser.lexer.next.type}")
        Parser.lexer.select_next()  # Valida e consome exatamente um token.

    @staticmethod
    def parse_program():
        children = []
        while Parser.lexer.next.type != "EOF":
            children.append(Parser.parse_statement())  # Cada linha produz um filho.
        return Block(None, children)  # Um bloco pode ter qualquer quantidade de filhos.

    @staticmethod
    def parse_statement():
        token = Parser.lexer.next
        if token.type == "IDEN":
            target = Identifier(token.value, [])  # Guarda o nome sem consultar seu valor.
            Parser.lexer.select_next()
            Parser.expect("ASSIGN")
            result = Assignment(None, [target, Parser.parse_expression()])
        elif token.type == "PRINT":
            Parser.lexer.select_next()
            Parser.expect("OPEN_PAR")
            result = Print(None, [Parser.parse_expression()])
            Parser.expect("CLOSE_PAR")
        elif token.type == "END":
            result = NoOp(None, [])  # Representa a instrução vazia.
        else:
            raise Exception(f"[Parser] Instrução inválida: {token.type}")
        Parser.expect("END")  # Toda instrução termina com uma quebra de linha.
        return result

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
        if token.type == "IDEN":
            Parser.lexer.select_next()
            return Identifier(token.value, [])  # A busca do valor só ocorrerá na avaliação.
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
        result = Parser.parse_program()  # O novo ponto de entrada é PROGRAM.
        if Parser.lexer.next.type != "EOF":
            raise Exception(f"[Parser] Esperado EOF, encontrado {Parser.lexer.next.type}")
        return result


def main():
    if len(sys.argv) != 2:
        raise Exception("[Main] Uso: python roteiro5-enxuto.py programa.go")
    with open(sys.argv[1], encoding="utf-8") as file:
        code = file.read() + "\n"  # A main acrescenta a quebra final pedida no roteiro.
    filtered = PrePro.filter(code)  # Pré-processa antes de criar o Lexer.
    root = Parser.run(filtered)  # Monta o programa inteiro antes de executá-lo.
    st = SymbolTable()  # Cria uma tabela nova para esta execução.
    root.evaluate(st)  # O bloco executa; somente Print produz saída.


if __name__ == "__main__":
    main()

