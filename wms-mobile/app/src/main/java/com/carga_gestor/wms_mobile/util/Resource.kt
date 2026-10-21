package com.carga_gestor.wms_mobile.util

/**
 * Sealed class para representar o estado de uma operação assíncrona
 * Loading -> Success | Error
 */
sealed class Resource<out T> {
    data class Success<out T>(val data: T) : Resource<T>()
    data class Error(val message: String, val code: Int? = null, val throwable: Throwable? = null) : Resource<Nothing>()
    object Loading : Resource<Nothing>()

    companion object {
        fun <T> success(data: T): Resource<T> = Success(data)
        fun <T> error(message: String, code: Int? = null, throwable: Throwable? = null): Resource<T> = Error(message, code, throwable)
        fun <T> loading(): Resource<T> = Loading
    }
}