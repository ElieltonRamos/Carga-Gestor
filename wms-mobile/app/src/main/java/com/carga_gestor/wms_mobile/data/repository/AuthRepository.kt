package com.carga_gestor.wms_mobile.data.repository

import com.carga_gestor.wms_mobile.data.api.ApiService
import com.carga_gestor.wms_mobile.data.model.LoginRequest
import com.carga_gestor.wms_mobile.data.model.LoginResponse
import com.carga_gestor.wms_mobile.data.model.User
import com.carga_gestor.wms_mobile.data.model.UserRole
import com.carga_gestor.wms_mobile.util.JwtDecoder
import com.carga_gestor.wms_mobile.util.NetworkErrorHandler
import com.carga_gestor.wms_mobile.util.Resource
import com.carga_gestor.wms_mobile.util.TokenManager
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) {

    /**
     * Realiza login e salva token
     */
    suspend fun login(request: LoginRequest): Resource<LoginResponse> {
        return try {
            val response = apiService.login(request)

            // Decodifica JWT para obter role e userId
            val payload = JwtDecoder.decode(response.token)
            if (payload == null) {
                Resource.error("Token inválido recebido do servidor")
            } else {
                // blockingAwait() fora da main thread
                withContext(Dispatchers.IO) {
                    tokenManager.saveToken(
                        token = response.token,
                        username = payload.username,
                        role = payload.role
                    ).blockingAwait()
                }

                Resource.success(response)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Resource.error(NetworkErrorHandler.getErrorMessage(e))
        }
    }

    /**
     * Obtém dados do usuário logado a partir do token salvo
     */
    suspend fun getCurrentUser(): Resource<User> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken().blockingGet()

            if (token.isNullOrBlank()) {
                return@withContext Resource.error("Nenhum token encontrado")
            }

            val payload = JwtDecoder.decode(token)
                ?: return@withContext Resource.error("Token inválido")

            // Verifica se token expirou
            if (JwtDecoder.isExpired(token)) {
                tokenManager.clearToken().blockingAwait()
                return@withContext Resource.error("Sessão expirada, faça login novamente")
            }

            // Cria objeto User a partir do payload
            val user = User(
                id = payload.userId,
                name = payload.username, // backend não retorna name no JWT, usamos username
                username = payload.username,
                role = UserRole.fromString(payload.role),
                active = true,
                createdAt = "",
                updatedAt = ""
            )

            Resource.success(user)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Resource.error(NetworkErrorHandler.getErrorMessage(e))
        }
    }

    /**
     * Verifica se há token válido salvo
     */
    suspend fun hasValidToken(): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken().blockingGet()
            !token.isNullOrBlank() && !JwtDecoder.isExpired(token)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Logout - limpa token
     */
    suspend fun logout(): Resource<Unit> = withContext(Dispatchers.IO) {
        try {
            tokenManager.clearToken().blockingAwait()
            Resource.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Resource.error(NetworkErrorHandler.getErrorMessage(e))
        }
    }
}