package com.carga_gestor.wms_mobile.ui.screens.scan

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat

private const val ACTION_DECODE = "android.intent.ACTION_DECODE_DATA" // (?)
private const val EXTRA_BARCODE = "barcode_string" // (?)

@Composable
fun HardwareScanEffect(onScan: (String) -> Unit) {
    val context = LocalContext.current
    val currentOnScan by rememberUpdatedState(onScan)

    DisposableEffect(context) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                intent.getStringExtra(EXTRA_BARCODE)
                    ?.trim()
                    ?.takeIf { it.isNotEmpty() }
                    ?.let(currentOnScan)
            }
        }
        ContextCompat.registerReceiver(
            context, receiver, IntentFilter(ACTION_DECODE),
            ContextCompat.RECEIVER_EXPORTED
        )
        onDispose { context.unregisterReceiver(receiver) }
    }
}