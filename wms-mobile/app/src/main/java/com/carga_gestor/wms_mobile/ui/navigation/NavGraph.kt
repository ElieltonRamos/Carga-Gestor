package com.carga_gestor.wms_mobile.ui.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.carga_gestor.wms_mobile.ui.screens.login.LoginScreen
import com.carga_gestor.wms_mobile.ui.screens.login.LoginViewModel

/**
 * Grafo de navegação principal
 */
fun NavGraphBuilder.buildNavGraph(navController: NavHostController) {
    composable(ScreenRoutes.LOGIN) {
        val viewModel: LoginViewModel = hiltViewModel()
        LoginScreen(navController = navController, viewModel = viewModel)
    }

    composable(ScreenRoutes.MAIN) {
        // TODO: Tela principal - lista de cargas
        MainPlaceholderScreen(
            onNavigateToLogin = {
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
    ) { backStackEntry ->
        val cargoId = backStackEntry.arguments?.getInt("cargoId") ?: 0
        val deliveryId = backStackEntry.arguments?.getInt("deliveryId")?.takeIf { it > 0 }
        // TODO: ScanScreen(cargoId, deliveryId)
        ScanPlaceholderScreen(cargoId = cargoId, deliveryId = deliveryId)
    }

    composable(ScreenRoutes.SETTINGS) {
        // TODO: SettingsScreen
        SettingsPlaceholderScreen()
    }
}

@Composable
fun MainPlaceholderScreen(onNavigateToLogin: () -> Unit) {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "Tela Principal - Lista de Cargas", fontSize = 18.sp)
            Button(onClick = onNavigateToLogin, modifier = Modifier.padding(top = 16.dp)) {
                Text("Logout")
            }
        }
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
fun ScanPlaceholderScreen(cargoId: Int, deliveryId: Int?) {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "Scanner - Carga #$cargoId", fontSize = 18.sp)
            deliveryId?.let {
                Text(
                    text = "Romaneio #$it",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
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