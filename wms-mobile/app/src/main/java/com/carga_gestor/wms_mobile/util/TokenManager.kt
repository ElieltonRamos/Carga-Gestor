package com.carga_gestor.wms_mobile.util

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import io.reactivex.rxjava3.core.Completable
import io.reactivex.rxjava3.core.Maybe
import io.reactivex.rxjava3.core.Single
import io.reactivex.rxjava3.schedulers.Schedulers
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    private val context: Context
) {

    private val prefs: SharedPreferences = context.getSharedPreferences("token_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val TOKEN_KEY = "auth_token"
    private val USERNAME_KEY = "username"
    private val ROLE_KEY = "role"

    /**
     * Salva token e dados do usuário
     */
    fun saveToken(token: String, username: String, role: String): Completable {
        return Completable.fromAction {
            prefs.edit()
                .putString(TOKEN_KEY, token)
                .putString(USERNAME_KEY, username)
                .putString(ROLE_KEY, role)
                .apply()
        }.subscribeOn(Schedulers.io())
    }

    /**
     * Obtém o token salvo
     */
    fun getToken(): Maybe<String> {
        return Maybe.fromCallable {
            prefs.getString(TOKEN_KEY, null)
        }.subscribeOn(Schedulers.io())
    }

    /**
     * Obtém o username salvo
     */
    fun getUsername(): Maybe<String> {
        return Maybe.fromCallable {
            prefs.getString(USERNAME_KEY, null)
        }.subscribeOn(Schedulers.io())
    }

    /**
     * Obtém o role salvo
     */
    fun getRole(): Maybe<String> {
        return Maybe.fromCallable {
            prefs.getString(ROLE_KEY, null)
        }.subscribeOn(Schedulers.io())
    }

    /**
     * Verifica se há token salvo (síncrono para verificação rápida)
     */
    fun hasTokenSync(): Boolean {
        return prefs.contains(TOKEN_KEY)
    }

    /**
     * Limpa todos os dados de autenticação (logout)
     */
    fun clearToken(): Completable {
        return Completable.fromAction {
            prefs.edit().clear().apply()
        }.subscribeOn(Schedulers.io())
    }

    /**
     * Obtém token de forma síncrona (para Interceptor)
     */
    fun getTokenSync(): String {
        return prefs.getString(TOKEN_KEY, "") ?: ""
    }

    /**
     * Obtém contexto (para uso interno)
     */
    fun getContext(): Context = context
}