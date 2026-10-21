package com.carga_gestor.wms_mobile.ui.screens.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.carga_gestor.wms_mobile.data.model.LoginRequest
import com.carga_gestor.wms_mobile.data.model.LoginResponse
import com.carga_gestor.wms_mobile.data.repository.AuthRepository
import com.carga_gestor.wms_mobile.util.Resource
import com.carga_gestor.wms_mobile.util.Resource.Companion.error
import com.carga_gestor.wms_mobile.util.Resource.Companion.loading
import com.carga_gestor.wms_mobile.util.Resource.Companion.success
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    // Estado da UI
    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState())
    val uiState = _uiState.asStateFlow()

    /**
     * Realiza login
     */
    fun login(username: String, password: String) {
        if (username.isBlank() || password.isBlank()) {
            _uiState.value = _uiState.value.copy(
                status = error("Preencha usuário e senha"),
                isLoading = false
            )
            return
        }

        _uiState.value = _uiState.value.copy(status = loading(), isLoading = true)

        viewModelScope.launch {
            val request = LoginRequest(username = username.trim(), password = password)
            val result = authRepository.login(request)

            _uiState.value = when (result) {
                is Resource.Success<LoginResponse> -> _uiState.value.copy(
                    status = success(result.data),
                    isLoading = false,
                    isLoggedIn = true
                )
                is Resource.Error -> _uiState.value.copy(
                    status = result,
                    isLoading = false,
                    isLoggedIn = false
                )
                is Resource.Loading -> _uiState.value.copy(isLoading = true)
            }
        }
    }

    /**
     * Limpa erro
     */
    fun clearError() {
        _uiState.value = _uiState.value.copy(status = LoginUiState().status)
    }

    /**
     * Verifica se há token salvo válido (para auto-login)
     */
    suspend fun checkSavedToken(): Boolean {
        return authRepository.hasValidToken()
    }
}

/**
 * Estado da tela de login
 */
data class LoginUiState(
    val status: Resource<LoginResponse> = Resource.Loading,
    val isLoading: Boolean = false,
    val isLoggedIn: Boolean = false
)