package com.carga_gestor.wms_mobile.ui.screens.scan

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.carga_gestor.wms_mobile.data.model.CargoDetail
import com.carga_gestor.wms_mobile.data.model.ScanReason
import com.carga_gestor.wms_mobile.data.model.ScanResponse
import com.carga_gestor.wms_mobile.data.model.ScanResult
import com.carga_gestor.wms_mobile.data.model.ScanVolume
import com.carga_gestor.wms_mobile.data.repository.CargoRepository
import com.carga_gestor.wms_mobile.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ScanFeedback(
    val result: ScanResult,
    val reason: ScanReason?,
    val message: String,
    val volume: ScanVolume?
)

data class ScanUiState(
    val cargo: CargoDetail? = null,
    val isLoading: Boolean = true,
    val totalVolumes: Int = 0,
    val loadedVolumes: Int = 0,
    val feedback: ScanFeedback? = null,
    val lastOkCode: String? = null,
    val removeMode: Boolean = false,
    val isProcessing: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ScanViewModel @Inject constructor(
    private val cargoRepository: CargoRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val cargoId: Int = checkNotNull(savedStateHandle["cargoId"])

    private val _uiState = MutableStateFlow(ScanUiState())
    val uiState: StateFlow<ScanUiState> = _uiState.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch { refreshCargo() }
    }

    private suspend fun refreshCargo() {
        when (val r = cargoRepository.getCargo(cargoId)) {
            is Resource.Success -> _uiState.update {
                it.copy(
                    cargo = r.data,
                    isLoading = false,
                    totalVolumes = r.data.totalVolumes,
                    loadedVolumes = r.data.loadedVolumes
                )
            }
            is Resource.Error -> _uiState.update {
                it.copy(isLoading = false, error = if (it.cargo == null) r.message else it.error)
            }
            Resource.Loading -> Unit
        }
    }

    fun toggleRemoveMode() {
        if (_uiState.value.isProcessing) return
        _uiState.update { it.copy(removeMode = !it.removeMode, feedback = null, error = null) }
    }

    fun onCodeScanned(code: String) {
        Log.d("ScanVM", "onCodeScanned code=$code removeMode=${_uiState.value.removeMode} processing=${_uiState.value.isProcessing}")
        if (_uiState.value.isProcessing) return
        if (_uiState.value.removeMode) removeByCode(code) else scanCode(code)
    }

    fun undoLast() {
        val code = _uiState.value.lastOkCode ?: return
        if (_uiState.value.isProcessing) return
        removeByCode(code)
    }

    private fun scanCode(code: String) {
        _uiState.update { it.copy(isProcessing = true, error = null) }
        viewModelScope.launch {
            try {
                when (val r = cargoRepository.scan(code, cargoId)) {
                    is Resource.Success -> {
                        applyScan(r.data)
                        if (r.data.result == ScanResult.OK) refreshCargo()
                    }
                    is Resource.Error -> _uiState.update { it.copy(error = r.message) }
                    Resource.Loading -> Unit
                }
            } finally {
                _uiState.update { it.copy(isProcessing = false) }
            }
        }
    }

    private fun removeByCode(code: String) {
        _uiState.update { it.copy(isProcessing = true, error = null) }
        viewModelScope.launch {
            try {
                when (val r = cargoRepository.undoScan(code, cargoId)) {
                    is Resource.Success -> {
                        _uiState.update {
                            it.copy(
                                totalVolumes = r.data.totalVolumes, // (?) formato da resposta do undo
                                loadedVolumes = r.data.loadedVolumes,
                                feedback = ScanFeedback(
                                    ScanResult.UNDO, null, r.data.message, r.data.volume
                                ),
                                lastOkCode = if (it.lastOkCode == code.trim()) null else it.lastOkCode,
                                removeMode = false
                            )
                        }
                        refreshCargo()
                    }
                    is Resource.Error -> _uiState.update { it.copy(error = r.message) }
                    Resource.Loading -> Unit
                }
            } finally {
                _uiState.update { it.copy(isProcessing = false) }
            }
        }
    }

    private fun applyScan(res: ScanResponse) = _uiState.update {
        Log.d("ScanVM", "scan result=${res.result} reason=${res.reason} loaded=${res.loadedVolumes}/${res.totalVolumes}")
        it.copy(
            totalVolumes = res.totalVolumes,
            loadedVolumes = res.loadedVolumes,
            feedback = ScanFeedback(res.result, res.reason, res.message, res.volume),
            lastOkCode = if (res.result == ScanResult.OK) res.code else it.lastOkCode
        )
    }
}