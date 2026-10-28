package com.carga_gestor.wms_mobile.ui.screens.scan

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat

private const val ACTION_DECODE = "android.intent.ACTION_DECODE_DATA" // (?)
private const val EXTRA_BARCODE = "barcode_string" // (?)
private const val TAG = "HardwareScan"
@Composable
fun HardwareScanEffect(onScan: (String) -> Unit) {
    val context = LocalContext.current
    val currentOnScan by rememberUpdatedState(onScan)

    DisposableEffect(context) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                Log.d(TAG, "action=${intent.action} extras=${intent.extras?.keySet()?.associateWith { intent.extras?.get(it) }}")

                val code = intent.getStringExtra(EXTRA_BARCODE)?.trim()
                if (code.isNullOrEmpty()) {
                    Log.w(TAG, "extra '$EXTRA_BARCODE' ausente ou vazio")
                    return
                }
                Log.d(TAG, "código lido: $code")
                currentOnScan(code)
            }
        }
        ContextCompat.registerReceiver(
            context, receiver, IntentFilter(ACTION_DECODE),
            ContextCompat.RECEIVER_EXPORTED
        )
        onDispose { context.unregisterReceiver(receiver) }
    }
}