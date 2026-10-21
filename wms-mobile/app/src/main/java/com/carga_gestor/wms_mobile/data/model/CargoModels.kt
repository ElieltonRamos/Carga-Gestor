package com.carga_gestor.wms_mobile.data.model

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.Serializable

/**
 * Status da Carga (backend: OPEN | LOADING | DEPARTED)
 */
enum class CargoStatus(@SerializedName("value") val value: String) {
    OPEN("OPEN"),
    LOADING("LOADING"),
    DEPARTED("DEPARTED");

    companion object {
        fun fromString(value: String): CargoStatus {
            return values().firstOrNull { it.value == value } ?: OPEN
        }
    }
}

/**
 * Resultado do Scan (backend: OK | ERROR | WARNING | UNDO)
 */
enum class ScanResult(@SerializedName("value") val value: String) {
    OK("OK"),
    ERROR("ERROR"),
    WARNING("WARNING"),
    UNDO("UNDO");

    companion object {
        fun fromString(value: String): ScanResult {
            return values().firstOrNull { it.value == value } ?: ERROR
        }
    }
}

/**
 * Razão do Scan (backend: NOT_FOUND | ALREADY_LOADED | WRONG_CARGO | CARGO_DEPARTED)
 */
enum class ScanReason(@SerializedName("value") val value: String) {
    NOT_FOUND("NOT_FOUND"),
    ALREADY_LOADED("ALREADY_LOADED"),
    WRONG_CARGO("WRONG_CARGO"),
    CARGO_DEPARTED("CARGO_DEPARTED");

    companion object {
        fun fromString(value: String): ScanReason? {
            return values().firstOrNull { it.value == value }
        }
    }
}

/**
 * Carga (resumo para lista)
 * GET /api/cargos (paginado)
 */
@Serializable
data class CargoSummary(
    @SerializedName("id") val id: Int,
    @SerializedName("loadOrder") val loadOrder: String,
    @SerializedName("totalDestinations") val totalDestinations: Int,
    @SerializedName("status") val status: CargoStatus,
    @SerializedName("loadDate") val loadDate: String, // YYYY-MM-DD
    @SerializedName("issueDate") val issueDate: String, // YYYY-MM-DD
    @SerializedName("driverName") val driverName: String?,
    @SerializedName("truck") val truck: String?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String,
    @SerializedName("pendingAtDeparture") val pendingAtDeparture: Int?
)

/**
 * Carga detalhada
 * GET /api/cargos/{id}
 */
@Serializable
data class CargoDetail(
    @SerializedName("id") val id: Int,
    @SerializedName("loadOrder") val loadOrder: String,
    @SerializedName("totalDestinations") val totalDestinations: Int,
    @SerializedName("status") val status: CargoStatus,
    @SerializedName("loadDate") val loadDate: String,
    @SerializedName("issueDate") val issueDate: String,
    @SerializedName("driverName") val driverName: String?,
    @SerializedName("driverPhone") val driverPhone: String?,
    @SerializedName("truck") val truck: String?,
    @SerializedName("inspectionResponsible") val inspectionResponsible: String?,
    @SerializedName("organizationResponsible") val organizationResponsible: String?,
    @SerializedName("assistant1") val assistant1: String?,
    @SerializedName("loadingResponsible") val loadingResponsible: String?,
    @SerializedName("warehouseKeeper") val warehouseKeeper: String?,
    @SerializedName("romaneioResponsible") val romaneioResponsible: String?,
    @SerializedName("startedAt") val startedAt: String?,
    @SerializedName("endedAt") val endedAt: String?,
    @SerializedName("departedAt") val departedAt: String?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String,
    @SerializedName("departedById") val departedById: Int?,
    @SerializedName("pendingAtDeparture") val pendingAtDeparture: Int?,
    @SerializedName("deliveries") val deliveries: List<DeliveryDetail>,
    @SerializedName("totalVolumes") val totalVolumes: Int,
    @SerializedName("loadedVolumes") val loadedVolumes: Int
)

/**
 * Entrega/Romaneio detalhado
 */
@Serializable
data class DeliveryDetail(
    @SerializedName("id") val id: Int,
    @SerializedName("sequence") val sequence: Int,
    @SerializedName("romaneioNumber") val romaneioNumber: String,
    @SerializedName("biddingNumber") val biddingNumber: String?,
    @SerializedName("modality") val modality: String?,
    @SerializedName("hasInstallation") val hasInstallation: Boolean,
    @SerializedName("status") val status: DeliveryStatus,
    @SerializedName("clientId") val clientId: Int?,
    @SerializedName("clientName") val clientName: String,
    @SerializedName("clientDocument") val clientDocument: String?,
    @SerializedName("clientAddress") val clientAddress: String?,
    @SerializedName("clientNeighborhood") val clientNeighborhood: String?,
    @SerializedName("clientCity") val clientCity: String,
    @SerializedName("clientState") val clientState: String?,
    @SerializedName("clientZipCode") val clientZipCode: String?,
    @SerializedName("clientPhone") val clientPhone: String?,
    @SerializedName("items") val items: List<DeliveryItemDetail>,
    @SerializedName("totalVolumes") val totalVolumes: Int,
    @SerializedName("loadedVolumes") val loadedVolumes: Int
)

/**
 * Status da Entrega (backend: GENERATED)
 */
enum class DeliveryStatus(@SerializedName("value") val value: String) {
    GENERATED("GENERATED");

    companion object {
        fun fromString(value: String): DeliveryStatus {
            return values().firstOrNull { it.value == value } ?: GENERATED
        }
    }
}

/**
 * Item da Entrega
 */
@Serializable
data class DeliveryItemDetail(
    @SerializedName("id") val id: Int,
    @SerializedName("code") val code: String?,
    @SerializedName("product") val product: String,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("volumeCount") val volumeCount: Int?,
    @SerializedName("weight") val weight: String?, // Decimal como string
    @SerializedName("notes") val notes: String?,
    @SerializedName("volumes") val volumes: List<VolumeDetail>,
    @SerializedName("totalVolumes") val totalVolumes: Int,
    @SerializedName("loadedVolumes") val loadedVolumes: Int
)

/**
 * Volume (unidade de carregamento com código de barras)
 * Volume.code = {cargoId}-{sequence}-{itemId}-{n}
 */
@Serializable
data class VolumeDetail(
    @SerializedName("id") val id: Int,
    @SerializedName("number") val number: Int,
    @SerializedName("code") val code: String, // Código de barras único
    @SerializedName("loaded") val loaded: Boolean,
    @SerializedName("loadedAt") val loadedAt: String?,
    @SerializedName("loadedById") val loadedById: Int?
)

/**
 * Request para Scan
 * POST /api/scans
 * Body: { code: string, cargoId: number }
 */
@Serializable
data class ScanRequest(
    @SerializedName("code") val code: String,
    @SerializedName("cargoId") val cargoId: Int
)

/**
 * Response do Scan
 */
@Serializable
data class ScanResponse(
    @SerializedName("result") val result: ScanResult,
    @SerializedName("reason") val reason: ScanReason?,
    @SerializedName("volume") val volume: VolumeDetail?,
    @SerializedName("message") val message: String?
)

/**
 * Log de Scan (histórico)
 * GET /api/scans
 */
@Serializable
data class ScanLog(
    @SerializedName("id") val id: Int,
    @SerializedName("code") val code: String,
    @SerializedName("result") val result: ScanResult,
    @SerializedName("reason") val reason: ScanReason?,
    @SerializedName("volumeId") val volumeId: Int?,
    @SerializedName("userId") val userId: Int,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("cargoId") val cargoId: Int?,
    @SerializedName("device") val device: String?
)

/**
 * Request para Undo Scan
 * POST /api/scans/undo
 */
@Serializable
data class ScanUndoRequest(
    @SerializedName("scanLogId") val scanLogId: Int,
    @SerializedName("reason") val reason: String // até 500 chars
)

/**
 * Response paginado padrão do backend
 */
@Serializable
data class PaginatedResponse<T>(
    @SerializedName("data") val data: List<T>,
    @SerializedName("total") val total: Int,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("totalPages") val totalPages: Int
)