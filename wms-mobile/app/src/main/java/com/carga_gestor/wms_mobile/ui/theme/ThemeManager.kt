package com.carga_gestor.wms_mobile.ui.theme

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

object ThemeManager {
    private const val PREFS = "theme_prefs"
    private const val KEY_DARK = "dark"

    private var prefs: SharedPreferences? = null

    /** null = segue o sistema */
    var override by mutableStateOf<Boolean?>(null)
        private set

    fun init(context: Context) {
        if (prefs != null) return
        val p = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs = p
        override = if (p.contains(KEY_DARK)) p.getBoolean(KEY_DARK, false) else null
    }

    fun set(dark: Boolean) {
        override = dark
        prefs?.edit()?.putBoolean(KEY_DARK, dark)?.apply()
    }

    @Composable
    fun isDark(): Boolean = override ?: isSystemInDarkTheme()
}