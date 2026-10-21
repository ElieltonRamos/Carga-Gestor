package com.carga_gestor.wms_mobile.util

import android.util.Base64
import com.google.gson.Gson
import com.google.gson.JsonObject

/**
 * Decodifica JWT para extrair claims (userId, username, role, etc.)
 * O backend retorna: { userId, username, role, iat, exp }
 */
object JwtDecoder {

    data class TokenPayload(
        val userId: Int,
        val username: String,
        val role: String, // ADMIN | OPERATOR | CHECKER
        val iat: Long,
        val exp: Long
    )

    /**
     * Decodifica o payload do JWT (parte do meio)
     */
    fun decode(token: String): TokenPayload? {
        return try {
            val parts = token.split(".")
            if (parts.size != 3) return null

            val payload = parts[1]
            // Adiciona padding se necessário
            val paddedPayload = payload.padEnd(payload.length + (4 - payload.length % 4) % 4, '=')
            val decoded = Base64.decode(paddedPayload, Base64.URL_SAFE or Base64.NO_WRAP)
            val json = String(decoded)
            val jsonObject = Gson().fromJson(json, JsonObject::class.java)

            TokenPayload(
                userId = jsonObject.get("userId").asInt,
                username = jsonObject.get("username").asString,
                role = jsonObject.get("role").asString,
                iat = jsonObject.get("iat").asLong,
                exp = jsonObject.get("exp").asLong
            )
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Verifica se o token está expirado
     */
    fun isExpired(token: String): Boolean {
        val payload = decode(token)
        if (payload == null) return true
        val now = System.currentTimeMillis() / 1000
        return payload.exp < now
    }

    /**
     * Verifica se o token expira em menos de X minutos
     */
    fun isExpiringSoon(token: String, minutes: Int = 5): Boolean {
        val payload = decode(token)
        if (payload == null) return true
        val now = System.currentTimeMillis() / 1000
        return payload.exp < now + (minutes * 60L)
    }
}