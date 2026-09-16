import sys

DIGITOS = "0123456789"


def tokenizar(codigo):
    tokens = []  # Cria a lista que vai receber todos os tokens.
    posicao = 0  # Este índice percorre caracteres da string.
    while posicao < len(codigo):  # Ainda há caracteres para ler?
        caractere = codigo[posicao]  # Consulta o caractere atual.
        if caractere.isspace():  # Espaço separa peças, mas não vira token.
            posicao += 1  # Pula um espaço sem alterar a string original.
        elif caractere == "+":
            tokens.append(("PLUS", "+"))  # Adiciona uma tupla de operador à lista.
            posicao += 1  # Avança além do sinal de mais.
        elif caractere == "-":
            tokens.append(("MINUS", "-"))  # Adiciona uma tupla de subtração.
            posicao += 1  # Avança além do sinal de menos.
        elif caractere in DIGITOS:
            numero = ""  # Começa um acumulador de dígitos.
            while posicao < len(codigo) and codigo[posicao] in DIGITOS:  # Os próximos caracteres ainda são dígitos?
                numero += codigo[posicao]  # Junta mais um dígito ao mesmo número.
                posicao += 1  # Avança o cursor de caracteres.
            tokens.append(("INT", int(numero)))  # Vários dígitos formam um só token INT.
        else:
            raise Exception(f"[Lexer] Caractere inválido {caractere!r} na posição {posicao}")  # Interrompe a tokenização.
    tokens.append(("EOF", ""))  # Acrescenta um único marcador de fim, fora do while.
    return tokens  # Só agora a lista inteira fica pronta para avaliar().


def avaliar(tokens):
    posicao = 0  # Outro índice local: agora percorre tokens, não caracteres.
    if tokens[posicao][0] != "INT":  # A expressão precisa começar por um número.
        raise Exception(f"[Parser] Esperado INT, encontrado {tokens[posicao][0]}")  # Rejeita o token inicial.
    resultado = tokens[posicao][1]  # Usa o valor do primeiro INT.
    posicao += 1  # Passa ao token seguinte.
    while tokens[posicao][0] in ("PLUS", "MINUS"):  # Há uma nova operação?
        operador = tokens[posicao][0]  # Guarda qual operação deve ser feita.
        posicao += 1  # Avança para o operando esperado.
        if tokens[posicao][0] != "INT":  # Um operador precisa ser seguido de número.
            raise Exception(f"[Parser] Esperado INT, encontrado {tokens[posicao][0]}")  # Rejeita um operando ausente.
        if operador == "PLUS":
            resultado += tokens[posicao][1]  # Soma o número ao resultado acumulado.
        else:
            resultado -= tokens[posicao][1]  # Subtrai o número do resultado acumulado.
        posicao += 1  # Avança para o próximo operador ou EOF.
    if tokens[posicao][0] != "EOF":  # Confere se não sobraram tokens.
        raise Exception(f"[Parser] Esperado EOF, encontrado {tokens[posicao][0]}")  # Rejeita, por exemplo, dois números seguidos.
    return resultado  # Retorna somente depois de validar toda a lista.


def executar(codigo):
    tokens = tokenizar(codigo)  # Espera a lista completa ficar pronta.
    return avaliar(tokens)  # Valida a ordem e calcula sobre essa lista.


def main():
    if len(sys.argv) != 2:  # Recebe uma expressão como único argumento.
        raise Exception("[Main] Uso: python roteiro1-enxuto.py '<expressão>'")
    print(executar(sys.argv[1]))  # Imprime apenas o resultado, sem esconder exceções.


if __name__ == "__main__":
    main()
