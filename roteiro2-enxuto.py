import sys


class Token:
    def __init__(self, type, value):
        self.type = type  # Guarda a categoria do token.
        self.value = value  # Guarda o valor concreto do token.


class Lexer:
    def __init__(self, source):
        self.source = source  # Preserva a string de entrada.
        self.position = 0  # Começa no primeiro caractere.
        self.next = None  # Ainda não preparou nenhum token.

    def select_next(self):
        while self.position < len(self.source) and self.source[self.position].isspace():  # Há espaço para pular?
            self.position += 1  # Avança um caractere em branco.
        if self.position >= len(self.source):  # Chegou ao fim da string?
            self.next = Token("EOF", "")  # Constrói o marcador de fim.
            return  # Devolve o controle a quem pediu o token.
        char = self.source[self.position]  # Consulta o caractere sob o cursor.
        if char in "+-":  # É um dos operadores permitidos?
            self.position += 1  # Consome o caractere do operador.
            self.next = Token("PLUS" if char == "+" else "MINUS", char)  # Prepara o operador em next.
        elif char in "0123456789":  # É o começo de um inteiro?
            number = ""  # Inicia o acumulador de dígitos.
            while self.position < len(self.source) and self.source[self.position] in "0123456789":  # Ainda há dígitos consecutivos?
                number += self.source[self.position]  # Acrescenta um dígito ao número.
                self.position += 1  # Move o cursor para o próximo caractere.
            self.next = Token("INT", int(number))  # Converte os dígitos e disponibiliza o token.
        else:
            raise Exception(f"[Lexer] Símbolo inválido {char!r} na posição {self.position}")  # Rejeita um caractere desconhecido.


class Parser:
    lexer = None

    @staticmethod
    def parse_expression():
        if Parser.lexer.next.type != "INT":  # A expressão deve começar por um inteiro.
            raise Exception(f"[Parser] Esperado INT, encontrado {Parser.lexer.next.type}")  # Rejeita o primeiro token.
        result = Parser.lexer.next.value  # Usa o primeiro número como resultado inicial.
        Parser.lexer.select_next()  # Pede o token que vem depois do número.
        while Parser.lexer.next.type in ("PLUS", "MINUS"):  # Há outra soma ou subtração?
            operator = Parser.lexer.next.type  # Guarda o operador antes de substituir next.
            Parser.lexer.select_next()  # Pede o número depois do operador.
            if Parser.lexer.next.type != "INT":  # Depois de um operador, exige um inteiro.
                raise Exception(f"[Parser] Esperado INT, encontrado {Parser.lexer.next.type}")  # Rejeita um operando ausente ou inválido.
            if operator == "PLUS":  # Decide qual conta fazer.
                result += Parser.lexer.next.value  # Soma o número ao resultado local.
            else:
                result -= Parser.lexer.next.value  # Subtrai o número do resultado local.
            Parser.lexer.select_next()  # Pede o próximo token para testar o laço.
        return result  # Devolve a conta parcial; next permanece no primeiro token não usado.

    @staticmethod
    def run(code):
        Parser.lexer = Lexer(code)  # Cria e guarda o Lexer desta execução.
        Parser.lexer.select_next()  # Prepara o primeiro token antes de analisar.
        result = Parser.parse_expression()  # Chama a análise e espera o resultado.
        if Parser.lexer.next.type != "EOF":  # Confere se a entrada inteira foi consumida.
            raise Exception(f"[Parser] Esperado EOF, encontrado {Parser.lexer.next.type}")  # Rejeita tokens que sobraram.
        return result  # Devolve o resultado validado.


def main():
    if len(sys.argv) != 2:  # Exige uma expressão como argumento.
        raise Exception("[Main] Uso: python roteiro2-enxuto.py '<expressão>'")  # Informa o uso correto.
    print(Parser.run(sys.argv[1]))  # Calcula a expressão e imprime somente o número.


if __name__ == "__main__":
    main()
