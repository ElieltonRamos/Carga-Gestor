package com.carga_gestor.wms_mobile.ui.screens.scan


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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
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
    HardwareScanEffect(onScan = viewModel::onCodeScanned)

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
            if (state.cargo != null) {
                OutlinedButton(
                    onClick = viewModel::undoLast,
                    enabled = state.lastOkCode != null && !state.isProcessing,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .height(56.dp)
                ) { Text("Desfazer último volume") }
            }
        }
    ) { padding ->
        val cargo = state.cargo
        when {
            cargo != null -> LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { SummaryHeader(state.loadedVolumes, state.totalVolumes) }
                state.error?.let { item { ErrorBanner(it) } }
                state.feedback?.let { item { FeedbackBanner(it) } }
                item {
                    Text(
                        "Romaneios",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                items(cargo.deliveries, key = { it.id }) { DeliveryCard(it) }
            }

            state.isLoading -> Box(
                Modifier.padding(padding).fillMaxSize(),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator() }

            else -> Column(
                Modifier.padding(padding).fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(state.error ?: "Não foi possível carregar a carga.", textAlign = TextAlign.Center)
                Spacer(Modifier.height(16.dp))
                Button(onClick = viewModel::reload) { Text("Tentar novamente") }
            }
        }
    }
}

@Composable
private fun progressColor(loaded: Int, total: Int): Color = when {
    total > 0 && loaded >= total -> MaterialTheme.extraColors.success
    loaded > 0 -> MaterialTheme.extraColors.warning
    else -> MaterialTheme.colorScheme.outline
}

@Composable
private fun SummaryHeader(loaded: Int, total: Int) {
    val complete = total > 0 && loaded >= total
    val color = progressColor(loaded, total)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            if (complete) "Tudo carregado!" else "Bipe o código do volume",
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
        ScanResult.UNDO -> "Volume desfeito"
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
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(36.dp))
            Column {
                Text(title, style = MaterialTheme.typography.titleLarge, color = Color.White)
                f.volume?.let {
                    Text(
                        "${it.product} · Romaneio ${it.romaneioNumber}",
                        color = Color.White
                    )
                }
            }
        }
    }
}

@Composable
private fun ErrorBanner(message: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
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
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(d.clientCity, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
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
                progress = { if (d.totalVolumes > 0) d.loadedVolumes / d.totalVolumes.toFloat() else 0f },
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