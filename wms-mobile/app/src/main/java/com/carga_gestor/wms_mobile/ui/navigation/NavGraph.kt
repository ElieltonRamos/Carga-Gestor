package com.carga_gestor.wms_mobile.ui.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.carga_gestor.wms_mobile.ui.screens.cargos.CargoListScreen
import com.carga_gestor.wms_mobile.ui.screens.cargos.CargoListViewModel
import com.carga_gestor.wms_mobile.ui.screens.login.LoginScreen
import com.carga_gestor.wms_mobile.ui.screens.login.LoginViewModel
import com.carga_gestor.wms_mobile.ui.screens.scan.ScanScreen

/**
 * Grafo de navegação principal
 */
fun NavGraphBuilder.buildNavGraph(navController: NavHostController) {
    composable(ScreenRoutes.LOGIN) {
        val viewModel: LoginViewModel = hiltViewModel()
        LoginScreen(navController = navController, viewModel = viewModel)
    }

    composable(ScreenRoutes.MAIN) {
        val viewModel: CargoListViewModel = hiltViewModel()
        CargoListScreen(
            viewModel = viewModel,
            onCargoClick = { cargoId -> navController.navigate(ScreenRoutes.scan(cargoId)) },
            onLogout = {
                navController.navigate(ScreenRoutes.LOGIN) {
                    popUpTo(ScreenRoutes.MAIN) { inclusive = true }
                }
            }
        )
    }

    composable(
        route = ScreenRoutes.CARGO_DETAIL,
        arguments = listOf(navArgument("cargoId") { type = NavType.IntType })
    ) { backStackEntry ->
        val cargoId = backStackEntry.arguments?.getInt("cargoId") ?: 0
        // TODO: CargoDetailScreen(cargoId)
        CargoDetailPlaceholderScreen(cargoId = cargoId)
    }

    composable(
        route = ScreenRoutes.SCAN,
        arguments = listOf(
            navArgument("cargoId") { type = NavType.IntType },
            navArgument("deliveryId") {
                type = NavType.IntType
                defaultValue = 0
            }
        )
    ) {
        ScanScreen(onBack = { navController.popBackStack() })
    }

    composable(ScreenRoutes.SETTINGS) {
        // TODO: SettingsScreen
        SettingsPlaceholderScreen()
    }
}

@Composable
fun CargoDetailPlaceholderScreen(cargoId: Int) {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "Detalhes da Carga #$cargoId", fontSize = 18.sp)
        }
    }
}

@Composable
fun SettingsPlaceholderScreen() {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "Configurações", fontSize = 18.sp)
        }
    }
}