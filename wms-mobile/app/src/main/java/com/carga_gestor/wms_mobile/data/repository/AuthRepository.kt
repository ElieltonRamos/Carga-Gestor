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
import io.reactivex.rxjava3.core.Completable
import io.reactivex.rxjava3.core.Single
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
                // Salva token e dados do usuário
                tokenManager.saveToken(
                    token = response.token,
                    username = payload.username,
                    role = payload.role
                ).blockingAwait()

                Resource.success(response)
            }
        } catch (e: Exception) {
            Resource.error(NetworkErrorHandler.getErrorMessage(e))
        }
    }

    /**
     * Obtém dados do usuário logado a partir do token salvo
     */
    suspend fun getCurrentUser(): Resource<User> {
        return try {
            val tokenMaybe = tokenManager.getToken()
            val token = tokenMaybe.blockingGet()

            if (token.isNullOrBlank()) {
                return Resource.error("Nenhum token encontrado")
            }

            val payload = JwtDecoder.decode(token)
            if (payload == null) {
                return Resource.error("Token inválido")
            }

            // Verifica se token expirou
            if (JwtDecoder.isExpired(token)) {
                // Limpa token expirado
                tokenManager.clearToken().blockingAwait()
                return Resource.error("Sessão expirada, faça login novamente")
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
        } catch (e: Exception) {
            Resource.error(NetworkErrorHandler.getErrorMessage(e))
        }
    }

    /**
     * Verifica se há token válido salvo
     */
    suspend fun hasValidToken(): Boolean {
        return try {
            val tokenMaybe = tokenManager.getToken()
            val token = tokenMaybe.blockingGet()
            token?.isNotBlank() == true && !JwtDecoder.isExpired(token!!)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Logout - limpa token
     */
    suspend fun logout(): Resource<Unit> {
        return try {
            tokenManager.clearToken().blockingAwait()
            Resource.success(Unit)
        } catch (e: Exception) {
            Resource.error(NetworkErrorHandler.getErrorMessage(e))
        }
    }
}