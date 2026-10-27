package com.carga_gestor.wms_mobile.ui.navigation

import kotlinx.serialization.Serializable

/**
 * Definição de rotas do app (type-safe navigation)
 * Usa sealed class para navegação type-safe
 */
@Serializable
sealed interface Screen {
    @Serializable
    data object Login : Screen

    @Serializable
    data object Main : Screen

    @Serializable
    data class CargoList(val cargoId: Int? = null) : Screen

    @Serializable
    data class CargoDetail(val cargoId: Int) : Screen

    @Serializable
    data class ScanScreen(val cargoId: Int, val deliveryId: Int? = null) : Screen

    @Serializable
    data object Settings : Screen
}

/**
 * Rotas em string para navegação
 */
object ScreenRoutes {
    const val LOGIN = "login"
    const val MAIN = "main"
    const val CARGO_DETAIL = "cargo_detail/{cargoId}"
    const val SCAN = "scan/{cargoId}?deliveryId={deliveryId}"
    const val SETTINGS = "settings"

    fun cargoDetail(cargoId: Int) = "cargo_detail/$cargoId"

    fun scan(cargoId: Int, deliveryId: Int? = null) =
        if (deliveryId != null) "scan/$cargoId?deliveryId=$deliveryId" else "scan/$cargoId"
}