package com.carga_gestor.wms_mobile.ui.screens.cargos

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.carga_gestor.wms_mobile.data.model.CargoStatus
import com.carga_gestor.wms_mobile.data.model.CargoSummary
import com.carga_gestor.wms_mobile.ui.theme.extraColors
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

private val DATE_FMT: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

private enum class DateTarget { FROM, TO }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CargoListScreen(
    viewModel: CargoListViewModel,
    onCargoClick: (Int) -> Unit,
    onLogout: () -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val listState = rememberLazyListState()
    var pickerTarget by remember { mutableStateOf<DateTarget?>(null) }

    LaunchedEffect(state.errorMessage) {
        state.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    val nearEnd by remember {
        derivedStateOf {
            val info = listState.layoutInfo
            val last = info.visibleItemsInfo.lastOrNull()?.index ?: 0
            last >= info.totalItemsCount - 3
        }
    }
    LaunchedEffect(nearEnd, state.cargos.size) {
        if (nearEnd) viewModel.loadMore()
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Cargas", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                    actionIconContentColor = MaterialTheme.colorScheme.onSurfaceVariant
                ),
                actions = {
                    IconButton(onClick = viewModel::reload) {
                        Icon(Icons.Filled.Refresh, contentDescription = "Atualizar")
                    }
                    IconButton(onClick = { viewModel.logout(onLogout) }) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sair")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            PeriodFilters(
                state = state,
                onPreset = viewModel::selectPreset,
                onFromClick = { pickerTarget = DateTarget.FROM },
                onToClick = { pickerTarget = DateTarget.TO }
            )

            Text(
                text = if (state.total == 1) "1 carga" else "${state.total} cargas",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )

            Box(modifier = Modifier.fillMaxSize()) {
                when {
                    state.isLoading -> CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )

                    state.cargos.isEmpty() -> Text(
                        text = "Nenhuma carga no período",
                        color = MaterialTheme.extraColors.textMuted,
                        modifier = Modifier.align(Alignment.Center)
                    )

                    else -> LazyColumn(
                        state = listState,
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(state.cargos, key = { it.id }) { cargo ->
                            CargoCard(cargo = cargo, onClick = { onCargoClick(cargo.id) })
                        }
                        if (state.isLoadingMore) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    pickerTarget?.let { target ->
        DatePickerHost(
            initial = if (target == DateTarget.FROM) state.from else state.to,
            onConfirm = { date ->
                if (target == DateTarget.FROM) viewModel.setFrom(date) else viewModel.setTo(date)
                pickerTarget = null
            },
            onDismiss = { pickerTarget = null }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PeriodFilters(
    state: CargoListUiState,
    onPreset: (PeriodPreset) -> Unit,
    onFromClick: () -> Unit,
    onToClick: () -> Unit
) {
    val chipColors = FilterChipDefaults.filterChipColors(
        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
        selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
    )

    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                PeriodPreset.TODAY to "Hoje",
                PeriodPreset.WEEK to "Esta semana",
                PeriodPreset.MONTH to "Este mês"
            ).forEach { (preset, label) ->
                FilterChip(
                    selected = state.preset == preset,
                    onClick = { onPreset(preset) },
                    label = { Text(label) },
                    colors = chipColors
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DateButton(
                label = "Início",
                date = state.from,
                highlighted = state.preset == PeriodPreset.CUSTOM,
                onClick = onFromClick,
                modifier = Modifier.weight(1f)
            )
            DateButton(
                label = "Fim",
                date = state.to,
                highlighted = state.preset == PeriodPreset.CUSTOM,
                onClick = onToClick,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun DateButton(
    label: String,
    date: LocalDate,
    highlighted: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedButton(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(
            1.dp,
            if (highlighted) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.outlineVariant
        ),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
        modifier = modifier
    ) {
        Icon(
            imageVector = Icons.Filled.CalendarMonth,
            contentDescription = null,
            modifier = Modifier.size(14.dp)
        )
        Spacer(Modifier.width(6.dp))
        Text(
            text = "$label: ${date.format(DATE_FMT)}",
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun CargoCard(cargo: CargoSummary, onClick: () -> Unit) {
    val extra = MaterialTheme.extraColors
    val (badgeBg, badgeFg, statusLabel) = statusStyle(cargo.status)
    val fraction =
        if (cargo.totalVolumes > 0) cargo.loadedVolumes.toFloat() / cargo.totalVolumes else 0f
    val people = listOfNotNull(cargo.driverName, cargo.truck).joinToString(" · ")
    val destinations =
        if (cargo.totalDestinations == 1) "1 romaneio" else "${cargo.totalDestinations} romaneios"

    Surface(
        onClick = onClick,
        shape = MaterialTheme.shapes.medium,
        color = extra.bgCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = cargo.loadOrder,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(Modifier.width(8.dp))
                Surface(shape = MaterialTheme.shapes.large, color = badgeBg) {
                    Text(
                        text = statusLabel,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = badgeFg,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp)
                    )
                }
            }

            if (people.isNotEmpty()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = people,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(Modifier.height(2.dp))
            Text(
                text = "Carregamento: ${formatDate(cargo.loadDate)} · $destinations",
                fontSize = 13.sp,
                color = extra.textMuted
            )

            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { fraction },
                color = badgeFg,
                trackColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "${cargo.loadedVolumes}/${cargo.totalVolumes} volumes",
                fontSize = 12.sp,
                color = extra.textMuted
            )
        }
    }
}

@Composable
private fun statusStyle(status: CargoStatus): Triple<Color, Color, String> {
    val extra = MaterialTheme.extraColors
    return when (status) {
        CargoStatus.OPEN -> Triple(extra.primarySubtle, MaterialTheme.colorScheme.primary, "Aberta")
        CargoStatus.LOADING -> Triple(extra.warningSubtle, extra.warning, "Carregando")
        CargoStatus.DEPARTED -> Triple(extra.successSubtle, extra.success, "Expedida")
    }
}

// loadDate chega em ISO UTC (2026-10-15T00:00:00.000Z): usa só a parte da data, sem converter fuso
private fun formatDate(iso: String): String =
    runCatching { LocalDate.parse(iso.take(10)).format(DATE_FMT) }.getOrDefault(iso)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DatePickerHost(
    initial: LocalDate,
    onConfirm: (LocalDate) -> Unit,
    onDismiss: () -> Unit
) {
    val pickerState = rememberDatePickerState(
        initialSelectedDateMillis = initial.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    )

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    val millis = pickerState.selectedDateMillis
                    if (millis != null) {
                        onConfirm(Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate())
                    } else {
                        onDismiss()
                    }
                }
            ) { Text("OK") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } }
    ) {
        DatePicker(state = pickerState)
    }
}