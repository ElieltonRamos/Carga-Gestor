package com.carga_gestor.wms_mobile.ui.screens.cargos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.carga_gestor.wms_mobile.data.model.CargoSummary
import com.carga_gestor.wms_mobile.data.repository.AuthRepository
import com.carga_gestor.wms_mobile.data.repository.CargoRepository
import com.carga_gestor.wms_mobile.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import javax.inject.Inject

enum class PeriodPreset { TODAY, WEEK, MONTH, CUSTOM }

data class CargoListUiState(
    val preset: PeriodPreset,
    val from: LocalDate,
    val to: LocalDate,
    val cargos: List<CargoSummary> = emptyList(),
    val total: Int = 0,
    val page: Int = 0,
    val totalPages: Int = 0,
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class CargoListViewModel @Inject constructor(
    private val cargoRepository: CargoRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(weekState())
    val uiState: StateFlow<CargoListUiState> = _uiState.asStateFlow()

    private var loadJob: Job? = null

    init {
        reload()
    }

    fun selectPreset(preset: PeriodPreset) {
        val today = today()
        val (from, to) = when (preset) {
            PeriodPreset.TODAY -> today to today
            PeriodPreset.WEEK -> weekStart(today) to today
            PeriodPreset.MONTH -> today.withDayOfMonth(1) to today
            PeriodPreset.CUSTOM -> return
        }
        _uiState.update { it.copy(preset = preset, from = from, to = to) }
        reload()
    }

    fun setFrom(date: LocalDate) {
        if (date.isAfter(_uiState.value.to)) {
            showError("A data inicial não pode ser maior que a final")
            return
        }
        _uiState.update { it.copy(preset = PeriodPreset.CUSTOM, from = date) }
        reload()
    }

    fun setTo(date: LocalDate) {
        if (date.isBefore(_uiState.value.from)) {
            showError("A data final não pode ser menor que a inicial")
            return
        }
        _uiState.update { it.copy(preset = PeriodPreset.CUSTOM, to = date) }
        reload()
    }

    fun reload() = load(reset = true)

    fun loadMore() = load(reset = false)

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onDone()
        }
    }

    private fun showError(message: String) {
        _uiState.update { it.copy(errorMessage = message) }
    }

    private fun load(reset: Boolean) {
        val s = _uiState.value
        if (!reset && (s.isLoading || s.isLoadingMore || s.page >= s.totalPages)) return

        if (reset) loadJob?.cancel()
        val nextPage = if (reset) 1 else s.page + 1
        _uiState.update { it.copy(isLoading = reset, isLoadingMore = !reset) }

        loadJob = viewModelScope.launch {
            val result = cargoRepository.getCargos(
                page = nextPage,
                limit = PAGE_SIZE,
                createdFrom = s.from.toString(),
                createdTo = s.to.toString()
            )
            val body = (result as? Resource.Success)?.data

            if (body != null) {
                _uiState.update { cur ->
                    cur.copy(
                        cargos = if (reset) body.data
                        else (cur.cargos + body.data).distinctBy { it.id },
                        total = body.total,
                        page = body.page,
                        totalPages = body.totalPages,
                        isLoading = false,
                        isLoadingMore = false
                    )
                }
            } else {
                val message = (result as? Resource.Error)?.message ?: "Erro ao carregar cargas"
                _uiState.update {
                    it.copy(isLoading = false, isLoadingMore = false, errorMessage = message)
                }
            }
        }
    }

    private companion object {
        const val PAGE_SIZE = 20
        val ZONE: ZoneId = ZoneId.of("America/Sao_Paulo")

        fun today(): LocalDate = LocalDate.now(ZONE)

        fun weekStart(date: LocalDate): LocalDate =
            date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

        fun weekState(): CargoListUiState {
            val today = today()
            return CargoListUiState(
                preset = PeriodPreset.WEEK,
                from = weekStart(today),
                to = today
            )
        }
    }
}