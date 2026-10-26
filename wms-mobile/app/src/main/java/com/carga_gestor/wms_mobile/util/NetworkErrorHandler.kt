package com.carga_gestor.wms_mobile.util

import retrofit2.HttpException

/**
 * Tratamento padronizado de erros de rede
 */
object NetworkErrorHandler {

    /**
     * Extrai mensagem de erro amigável de uma exceção
     */
    fun getErrorMessage(throwable: Throwable): String {
        return when (throwable) {
            is HttpException -> {
                val code = throwable.code()
                val responseBody = throwable.response()?.errorBody()?.string()
                when (code) {
                    400 -> "Dados inválidos: ${parseErrorBody(responseBody)}"
                    401 -> "Credenciais inválidas ou sessão expirada"
                    403 -> "Acesso negado"
                    404 -> parseErrorBody(responseBody).ifBlank { "Recurso não encontrado" }
                    409 -> parseErrorBody(responseBody).ifBlank { "Conflito ao processar a solicitação" }
                    500 -> "Erro interno do servidor"
                    else -> "Erro $code: ${parseErrorBody(responseBody)}"
                }
            }
            is java.net.UnknownHostException -> "Sem conexão com a internet"
            is java.net.ConnectException -> "Não foi possível conectar ao servidor"
            is java.net.SocketTimeoutException -> "Tempo de conexão esgotado"
            else -> "Erro inesperado: ${throwable.message}"
        }
    }

    private fun parseErrorBody(body: String?): String {
        return if (body.isNullOrBlank()) {
            ""
        } else {
            try {
                // Tenta parsear JSON do erro do backend
                // Backend retorna: { "message": "..." } ou { "message": ["...", "..."] }
                val json = com.google.gson.JsonParser.parseString(body).asJsonObject
                val message = json.get("message")
                if (message != null) {
                    if (message.isJsonArray) {
                        message.asJsonArray.joinToString(", ") { it.asString }
                    } else {
                        message.asString
                    }
                } else {
                    body
                }
            } catch (e: Exception) {
                body
            }
        }
    }
}