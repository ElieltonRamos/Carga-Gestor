package com.carga_gestor.wms_mobile.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

/** Tokens sem equivalente direto no Material 3. */
@Immutable
data class ExtraColors(
    val success: Color,
    val successSubtle: Color,
    val warning: Color,
    val warningSubtle: Color,
    val dangerSubtle: Color,
    val primarySubtle: Color,
    val primaryHover: Color,
    val primaryDark: Color,
    val textMuted: Color,
    val textDisabled: Color,
    val borderMd: Color,
    val bgCard: Color,
    val inputBg: Color,
    val printBg: Color,
    val printInk: Color,
)

private val LightExtraColors = ExtraColors(
    success = LightSuccess,
    successSubtle = LightSuccessSubtle,
    warning = LightWarning,
    warningSubtle = LightWarningSubtle,
    dangerSubtle = LightDangerSubtle,
    primarySubtle = LightPrimarySubtle,
    primaryHover = LightPrimaryHover,
    primaryDark = LightPrimaryDark,
    textMuted = LightTextMuted,
    textDisabled = LightTextDisabled,
    borderMd = LightBorderMd,
    bgCard = LightBgCard,
    inputBg = LightBgCard,
    printBg = PrintBg,
    printInk = PrintInk,
)

private val DarkExtraColors = ExtraColors(
    success = DarkSuccess,
    successSubtle = DarkSuccessSubtle,
    warning = DarkWarning,
    warningSubtle = DarkWarningSubtle,
    dangerSubtle = DarkDangerSubtle,
    primarySubtle = DarkPrimarySubtle,
    primaryHover = DarkPrimaryHover,
    primaryDark = DarkPrimaryDark,
    textMuted = DarkTextMuted,
    textDisabled = DarkTextDisabled,
    borderMd = DarkBorderMd,
    bgCard = DarkBgCard,
    inputBg = DarkSurfaceLow,
    printBg = PrintBg,
    printInk = PrintInk,
)

val LocalExtraColors = staticCompositionLocalOf { LightExtraColors }

val MaterialTheme.extraColors: ExtraColors
    @Composable get() = LocalExtraColors.current

private val LightColorScheme = lightColorScheme(
    primary = LightPrimary,
    onPrimary = LightTextInverse,
    primaryContainer = LightPrimarySubtle,
    onPrimaryContainer = LightPrimary,
    secondary = LightTextSecondary,
    onSecondary = LightTextInverse,
    secondaryContainer = LightSurfaceHigh,
    onSecondaryContainer = LightTextPrimary,
    tertiary = LightSuccess,
    onTertiary = LightTextInverse,
    tertiaryContainer = LightSuccessSubtle,
    onTertiaryContainer = LightSuccess,
    background = LightBgBase,
    onBackground = LightTextPrimary,
    surface = LightBgBase,
    onSurface = LightTextPrimary,
    surfaceVariant = LightSurface,
    onSurfaceVariant = LightTextSecondary,
    surfaceContainerLowest = LightBgCard,
    surfaceContainerLow = LightSurfaceLow,
    surfaceContainer = LightSurface,
    surfaceContainerHigh = LightSurfaceHigh,
    surfaceContainerHighest = LightSurfaceHighest,
    outline = LightBorderMd,
    outlineVariant = LightBorder,
    error = LightDanger,
    onError = LightTextInverse,
    errorContainer = LightDangerSubtle,
    onErrorContainer = LightDanger,
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = Color.White,
    primaryContainer = DarkPrimarySubtle,
    onPrimaryContainer = DarkPrimaryText,
    secondary = DarkTextSecondary,
    onSecondary = DarkTextInverse,
    secondaryContainer = DarkSurfaceHigh,
    onSecondaryContainer = DarkTextPrimary,
    tertiary = DarkSuccess,
    onTertiary = DarkTextInverse,
    tertiaryContainer = DarkSuccessSubtle,
    onTertiaryContainer = DarkSuccess,
    background = DarkBgBase,
    onBackground = DarkTextPrimary,
    surface = DarkBgBase,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurface,
    onSurfaceVariant = DarkTextSecondary,
    surfaceContainerLowest = DarkBgCard,
    surfaceContainerLow = DarkSurfaceLow,
    surfaceContainer = DarkSurface,
    surfaceContainerHigh = DarkSurfaceHigh,
    surfaceContainerHighest = DarkSurfaceHighest,
    outline = DarkBorderMd,
    outlineVariant = DarkBorder,
    error = DarkDanger,
    onError = DarkTextInverse,
    errorContainer = DarkDangerSubtle,
    onErrorContainer = DarkDanger,
)

private val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(4.dp),
    medium = RoundedCornerShape(4.dp),
    large = RoundedCornerShape(12.dp),
    extraLarge = RoundedCornerShape(12.dp),
)

@Composable
fun WmsmobileTheme(
    darkTheme: Boolean? = null,
    content: @Composable () -> Unit
) {
    ThemeManager.init(LocalContext.current)

    val isDark = darkTheme ?: ThemeManager.isDark()
    val colorScheme = if (isDark) DarkColorScheme else LightColorScheme
    val extraColors = if (isDark) DarkExtraColors else LightExtraColors

    CompositionLocalProvider(LocalExtraColors provides extraColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            shapes = AppShapes,
            content = content
        )
    }
}