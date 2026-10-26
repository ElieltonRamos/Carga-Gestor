package com.carga_gestor.wms_mobile.data.repository

import com.carga_gestor.wms_mobile.data.api.ApiService
import com.carga_gestor.wms_mobile.data.model.CargoDetail
import com.carga_gestor.wms_mobile.data.model.CargoStatus
import com.carga_gestor.wms_mobile.data.model.CargoSummary
import com.carga_gestor.wms_mobile.data.model.PaginatedResponse
import com.carga_gestor.wms_mobile.data.model.ScanRequest
import com.carga_gestor.wms_mobile.data.model.ScanResponse
import com.carga_gestor.wms_mobile.util.NetworkErrorHandler
import com.carga_gestor.wms_mobile.util.Resource
import kotlinx.coroutines.CancellationException
import javax.inject.Inject
import javax.inject.Singleton
import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.provider.Settings
import dagger.hilt.android.qualifiers.ApplicationContext

@Singleton
class CargoRepository @Inject constructor(
    private val apiService: ApiService,
    @ApplicationContext private val context: Context
) {

    private val deviceId: String by lazy { readDeviceId() }

    @SuppressLint("HardwareIds")
    private fun readDeviceId(): String {
        val androidId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ).orEmpty()
        return "${Build.MODEL} ($androidId)".take(100)
    }


    suspend fun getCargos(
        page: Int = 1,
        limit: Int = 10,
        createdFrom: String? = null,
        createdTo: String? = null,
        status: CargoStatus? = null,
        search: String? = null,
        loadDate: String? = null
    ): Resource<PaginatedResponse<CargoSummary>> = safeCall {
        apiService.getCargos(
            page = page,
            limit = limit,
            createdFrom = createdFrom,
            createdTo = createdTo,
            status = status?.value,
            search = search?.takeIf { it.isNotBlank() },
            loadDate = loadDate
        )
    }

    suspend fun getCargo(id: Int): Resource<CargoDetail> = safeCall {
        apiService.getCargo(id)
    }

    suspend fun scan(code: String, cargoId: Int): Resource<ScanResponse> = safeCall {
        apiService.scan(
            request = ScanRequest(code = code.trim(), cargoId = cargoId),
            deviceId = deviceId
        )
    }

    suspend fun undoScan(code: String, cargoId: Int): Resource<ScanResponse> = safeCall {
        apiService.undoScan(
            request = ScanRequest(code = code.trim(), cargoId = cargoId),
            deviceId = deviceId
        )
    }

    private suspend fun <T> safeCall(block: suspend () -> T): Resource<T> {
        return try {
            Resource.success(block())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Resource.error(NetworkErrorHandler.getErrorMessage(e))
        }
    }
}