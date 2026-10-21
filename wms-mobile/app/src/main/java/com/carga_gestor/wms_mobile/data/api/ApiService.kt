package com.carga_gestor.wms_mobile.data.api

import com.carga_gestor.wms_mobile.data.model.LoginRequest
import com.carga_gestor.wms_mobile.data.model.LoginResponse
import com.carga_gestor.wms_mobile.data.model.User
import com.carga_gestor.wms_mobile.data.model.CargoDetail
import com.carga_gestor.wms_mobile.data.model.CargoSummary
import com.carga_gestor.wms_mobile.data.model.PaginatedResponse
import com.carga_gestor.wms_mobile.data.model.ScanLog
import com.carga_gestor.wms_mobile.data.model.ScanRequest
import com.carga_gestor.wms_mobile.data.model.ScanResponse
import com.carga_gestor.wms_mobile.data.model.ScanUndoRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Interface Retrofit para comunicação com a API do backend
 * Base URL: http://<host>:3004/api
 * Swagger: http://<host>:3004/swagger
 */
interface ApiService {

    // ==================== AUTH ====================

    /**
     * Login de usuário
     * POST /api/users/login
     * Response: { token, licenseWarning? }
     */
    @POST("users/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    /**
     * Obter usuário logado (via token)
     * GET /api/users/me (se existir) ou usar payload do JWT
     * Como o backend não tem /me, usamos o payload do JWT
     */

    // ==================== COMPANY ====================

    /**
     * Obter dados da empresa
     * GET /api/company
     */
    @GET("company")
    suspend fun getCompany(): User // TODO: mudar para Company model quando criado

    // ==================== CARGOS ====================

    /**
     * Listar cargas com paginação e filtros
     * GET /api/cargos
     * Query params: page, limit, createdFrom, createdTo, status, search, loadDate
     */
    @GET("cargos")
    suspend fun getCargos(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("createdFrom") createdFrom: String? = null,
        @Query("createdTo") createdTo: String? = null,
        @Query("status") status: String? = null,
        @Query("search") search: String? = null,
        @Query("loadDate") loadDate: String? = null
    ): PaginatedResponse<CargoSummary>

    /**
     * Obter detalhes de uma carga
     * GET /api/cargos/{id}
     */
    @GET("cargos/{id}")
    suspend fun getCargo(@Path("id") id: Int): CargoDetail

    /**
     * Expedir carga (DEPARTED)
     * POST /api/cargos/{id}/depart
     * Body: { force?: boolean }
     */
    @POST("cargos/{id}/depart")
    suspend fun departCargo(
        @Path("id") id: Int,
        @Body body: Map<String, Boolean> = emptyMap()
    ): CargoDetail

    /**
     * Reabrir carga (OPEN)
     * POST /api/cargos/{id}/reopen
     * Body: { reason: string (max 500) }
     */
    @POST("cargos/{id}/reopen")
    suspend fun reopenCargo(
        @Path("id") id: Int,
        @Body body: Map<String, String>
    ): CargoDetail

    // ==================== SCANS ====================

    /**
     * Registrar scan (bipagem)
     * POST /api/scans
     * Body: { code: string, cargoId: number }
     */
    @POST("scans")
    suspend fun scan(@Body request: ScanRequest): ScanResponse

    /**
     * Desfazer scan
     * POST /api/scans/undo
     * Body: { scanLogId: number, reason: string }
     */
    @POST("scans/undo")
    suspend fun undoScan(@Body request: ScanUndoRequest): ScanResponse

    /**
     * Histórico de scans
     * GET /api/scans
     * Query params: cargoId, userId, result, from, to, page, limit
     */
    @GET("scans")
    suspend fun getScanLogs(
        @Query("cargoId") cargoId: Int? = null,
        @Query("userId") userId: Int? = null,
        @Query("result") result: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PaginatedResponse<ScanLog>
}