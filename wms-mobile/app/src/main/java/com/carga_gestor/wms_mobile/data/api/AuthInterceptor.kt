package com.carga_gestor.wms_mobile.data.api

import com.carga_gestor.wms_mobile.util.TokenManager
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Obtém token de forma síncrona (SharedPreferences backup)
        val token = tokenManager.getTokenSync()

        return if (token.isNotBlank()) {
            val authorizedRequest = originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
            chain.proceed(authorizedRequest)
        } else {
            chain.proceed(originalRequest)
        }
    }
}