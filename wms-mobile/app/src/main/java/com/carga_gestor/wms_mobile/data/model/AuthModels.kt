package com.carga_gestor.wms_mobile.data.model

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.Serializable

/**
 * Request para login
 * POST /api/users/login
 */
@Serializable
data class LoginRequest(
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String
)

/**
 * Response do login
 * { token: string, licenseWarning?: boolean }
 */
@Serializable
data class LoginResponse(
    @SerializedName("token") val token: String,
    @SerializedName("licenseWarning") val licenseWarning: Boolean? = null
)

/**
 * Modelo do usuário (do GET /users/{id} ou payload do JWT)
 */
@Serializable
data class User(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("username") val username: String,
    @SerializedName("role") val role: UserRole,
    @SerializedName("active") val active: Boolean,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

/**
 * Roles do sistema (backend: ADMIN | OPERATOR | CHECKER)
 */
enum class UserRole(@SerializedName("value") val value: String) {
    ADMIN("ADMIN"),
    OPERATOR("OPERATOR"),
    CHECKER("CHECKER");

    companion object {
        fun fromString(value: String): UserRole {
            return values().firstOrNull { it.value == value } ?: OPERATOR
        }
    }
}

/**
 * Modelo para empresa (Company)
 * GET /api/company
 * Nota: @Serializable removido pois Map<String, Any> não é suportado por kotlinx.serialization
 * Usa apenas @SerializedName para Gson
 */
data class Company(
    @SerializedName("id") val id: Int,
    @SerializedName("cnpj") val cnpj: String,
    @SerializedName("name") val name: String, // razão social
    @SerializedName("tradeName") val tradeName: String?,
    @SerializedName("stateRegistration") val stateRegistration: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("street") val street: String?,
    @SerializedName("streetNumber") val streetNumber: String?,
    @SerializedName("neighborhood") val neighborhood: String?,
    @SerializedName("city") val city: String?,
    @SerializedName("state") val state: String?,
    @SerializedName("zipCode") val zipCode: String?,
    @SerializedName("licenseKey") val licenseKey: String?,
    @SerializedName("settings") val settings: Map<String, Any>?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)