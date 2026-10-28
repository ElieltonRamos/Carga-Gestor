package com.carga_gestor.wms_mobile.ui.screens.scan

import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.KeyEvent as AndroidKeyEvent
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.carga_gestor.wms_mobile.data.model.DeliveryDetail
import com.carga_gestor.wms_mobile.data.model.ScanReason
import com.carga_gestor.wms_mobile.data.model.ScanResult
import com.carga_gestor.wms_mobile.ui.theme.extraColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanScreen(
    onBack: () -> Unit,
    viewModel: ScanViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var code by remember { mutableStateOf("") }
    var clearTick by remember { mutableIntStateOf(0) }
    var keyboardEnabled by remember { mutableStateOf(false) }
    val loaded = state.cargo != null

    fun submit() {
        val value = code.trim()
        code = ""
        clearTick++
        if (value.isNotEmpty()) viewModel.onCodeScanned(value)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Conferência") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                }
            )
        },
        bottomBar = {
            if (loaded) {
                Button(
                    onClick = viewModel::toggleRemoveMode,
                    enabled = !state.isProcessing,
                    colors = if (state.removeMode) {
                        ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        )
                    } else {
                        ButtonDefaults.buttonColors()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .height(56.dp)
                ) {
                    Text(if (state.removeMode) "Cancelar remoção" else "Remover um volume")
                }
            }
        }
    ) { padding ->
        val cargo = state.cargo
        when {
            cargo != null -> Column(
                modifier = Modifier.padding(padding).fillMaxSize()
            ) {
                Column(
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    SummaryHeader(
                        loaded = state.loadedVolumes,
                        total = state.totalVolumes,
                        removeMode = state.removeMode
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CodeInput(
                            onValueChange = { code = it },
                            onSubmit = { submit() },
                            hint = if (state.removeMode) "Bipe ou digite o volume a remover"
                            else "Bipe ou digite o código do volume",
                            keyboardEnabled = keyboardEnabled,
                            clearTick = clearTick,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { submit() }, enabled = code.isNotBlank()) {
                            Icon(
                                Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Enviar código"
                            )
                        }
                    }
                    TextButton(onClick = { keyboardEnabled = !keyboardEnabled }) {
                        Text(if (keyboardEnabled) "Ocultar teclado" else "Usar teclado")
                    }
                    if (state.removeMode) RemoveModeBanner()
                    state.error?.let { ErrorBanner(it) }
                    state.feedback?.let { FeedbackBanner(it) }
                }

                LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(
                            "Romaneios",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    items(cargo.deliveries, key = { it.id }) { DeliveryCard(it) }
                }
            }

            state.isLoading -> Box(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator() }

            else -> Column(
                modifier = Modifier.padding(padding).fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    state.error ?: "Não foi possível carregar a carga.",
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(16.dp))
                Button(onClick = viewModel::reload) { Text("Tentar novamente") }
            }
        }
    }
}

@Composable
private fun CodeInput(
    onValueChange: (String) -> Unit,
    onSubmit: () -> Unit,
    hint: String,
    keyboardEnabled: Boolean,
    clearTick: Int,
    modifier: Modifier = Modifier
) {
    val currentOnChange by rememberUpdatedState(onValueChange)
    val currentOnSubmit by rememberUpdatedState(onSubmit)
    val textColor = MaterialTheme.colorScheme.onSurface.toArgb()
    val hintColor = MaterialTheme.colorScheme.onSurfaceVariant.toArgb()

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            EditText(ctx).apply {
                setSingleLine(true)
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                imeOptions = EditorInfo.IME_ACTION_DONE
                textSize = 22f
                addTextChangedListener(object : TextWatcher {
                    override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) = Unit
                    override fun onTextChanged(s: CharSequence?, st: Int, b: Int, c: Int) = Unit
                    override fun afterTextChanged(s: Editable?) {
                        currentOnChange(s?.toString().orEmpty())
                    }
                })
                setOnEditorActionListener { _, actionId, event ->
                    val enter = event?.keyCode == AndroidKeyEvent.KEYCODE_ENTER &&
                            event.action == AndroidKeyEvent.ACTION_DOWN
                    if (actionId == EditorInfo.IME_ACTION_DONE || enter) {
                        currentOnSubmit()
                        true
                    } else {
                        false
                    }
                }
                post { requestFocus() }
            }
        },
        update = { et ->
            et.hint = hint
            et.setTextColor(textColor)
            et.setHintTextColor(hintColor)
            et.showSoftInputOnFocus = keyboardEnabled
            if (et.tag != clearTick) {
                et.tag = clearTick
                et.text.clear()
            }
        }
    )
}

@Composable
private fun progressColor(loaded: Int, total: Int): Color = when {
    total > 0 && loaded >= total -> MaterialTheme.extraColors.success
    loaded > 0 -> MaterialTheme.extraColors.warning
    else -> MaterialTheme.colorScheme.outline
}

@Composable
private fun SummaryHeader(loaded: Int, total: Int, removeMode: Boolean) {
    val complete = total > 0 && loaded >= total
    val color = progressColor(loaded, total)
    val hint = when {
        removeMode -> "Bipe o volume que deseja remover"
        complete -> "Tudo carregado!"
        else -> "Bipe o código do volume"
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            hint,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            "$loaded de $total volumes",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold
        )
        LinearProgressIndicator(
            progress = { if (total > 0) loaded / total.toFloat() else 0f },
            color = color,
            trackColor = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(6.dp))
        )
    }
}

@Composable
private fun RemoveModeBanner() {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.error),
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            "Modo remover: o próximo volume bipado será tirado da carga",
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.titleMedium,
            color = Color.White
        )
    }
}

@Composable
private fun FeedbackBanner(f: ScanFeedback) {
    val container = when (f.result) {
        ScanResult.OK -> MaterialTheme.extraColors.success
        ScanResult.WARNING, ScanResult.UNDO -> MaterialTheme.extraColors.warning
        ScanResult.ERROR -> MaterialTheme.colorScheme.error
    }
    val icon = when (f.result) {
        ScanResult.OK -> Icons.Filled.CheckCircle
        ScanResult.WARNING -> Icons.Filled.Warning
        ScanResult.UNDO -> Icons.Filled.Refresh
        ScanResult.ERROR -> Icons.Filled.Close
    }
    val title = when (f.result) {
        ScanResult.OK -> "Volume carregado"
        ScanResult.UNDO -> "Volume removido"
        ScanResult.WARNING -> "Este volume já foi bipado"
        ScanResult.ERROR -> when (f.reason) {
            ScanReason.NOT_FOUND -> "Código não reconhecido"
            ScanReason.WRONG_CARGO -> "Volume de outra carga"
            ScanReason.CARGO_DEPARTED -> "Esta carga já saiu"
            else -> f.message
        }
    }
    Card(
        colors = CardDefaults.cardColors(containerColor = container),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(36.dp)
            )
            Column {
                Text(title, style = MaterialTheme.typography.titleLarge, color = Color.White)
                f.volume?.let {
                    Text("${it.product} · Romaneio ${it.romaneioNumber}", color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun ErrorBanner(message: String) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            message,
            modifier = Modifier.padding(16.dp),
            color = MaterialTheme.colorScheme.onErrorContainer
        )
    }
}

@Composable
private fun DeliveryCard(d: DeliveryDetail) {
    val color = progressColor(d.loadedVolumes, d.totalVolumes)
    val complete = d.totalVolumes > 0 && d.loadedVolumes >= d.totalVolumes
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.extraColors.bgCard),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        d.clientCity,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Romaneio ${d.romaneioNumber} · ${d.clientName}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (complete) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = "Completo", tint = color)
                    Spacer(Modifier.width(6.dp))
                }
                Text(
                    "${d.loadedVolumes}/${d.totalVolumes}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
            }
            LinearProgressIndicator(
                progress = {
                    if (d.totalVolumes > 0) d.loadedVolumes / d.totalVolumes.toFloat() else 0f
                },
                color = color,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp))
            )
            d.items.forEach { item ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(item.product, modifier = Modifier.weight(1f))
                    Text(
                        "${item.loadedVolumes}/${item.totalVolumes}",
                        fontWeight = FontWeight.Bold,
                        color = progressColor(item.loadedVolumes, item.totalVolumes)
                    )
                }
            }
        }
    }
}