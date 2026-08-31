package com.mapbot.pertamina.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.mapbot.pertamina.ui.screens.*

sealed class Screen(val route: String) {
    object Pricing : Screen("pricing")
    object License : Screen("license")
    object Login : Screen("login")
    object Home : Screen("home")
    object Bot : Screen("bot")
    object Settings : Screen("settings")
    object Checkout : Screen("checkout/{paket}") {
        fun createRoute(paket: String) = "checkout/$paket"
    }
}

@Composable
fun AppNavigation(navController: NavHostController = rememberNavController()) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val hasValidLicense = remember { com.mapbot.pertamina.util.LicenseManager.getLicenseStatus(context).isValid }
    val startRoute = if (hasValidLicense) Screen.Login.route else Screen.Pricing.route

    NavHost(navController = navController, startDestination = startRoute) {
        composable(Screen.Pricing.route) {
            PricingScreen(
                onLicenseActivated = {
                    // Lisensi aktif otomatis → langsung ke Login/Home, skip License screen
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Pricing.route) { inclusive = true }
                    }
                },
                onNavigateToLicense = {
                    navController.navigate(Screen.License.route)
                }
            )
        }
        composable(Screen.License.route) {
            LicenseScreen(
                onLicenseValid = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.License.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToBot = { navController.navigate(Screen.Bot.route) },
                onNavigateToSettings = { navController.navigate(Screen.Settings.route) }
            )
        }
        composable(Screen.Bot.route) {
            BotScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(Screen.Settings.route) {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(Screen.Checkout.route) { backStackEntry ->
            val paket = backStackEntry.arguments?.getString("paket") ?: "starter"
            CheckoutScreen(
                url = "https://map-pertamina-web.vercel.app/checkout?paket=$paket",
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}

