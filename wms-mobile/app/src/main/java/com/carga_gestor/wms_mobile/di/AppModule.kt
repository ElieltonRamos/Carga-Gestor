package com.carga_gestor.wms_mobile.di

import android.content.Context
import com.carga_gestor.wms_mobile.data.api.ApiService
import com.carga_gestor.wms_mobile.data.api.AuthInterceptor
import com.carga_gestor.wms_mobile.data.repository.AuthRepository
import com.carga_gestor.wms_mobile.util.TokenManager
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dagger.Provides
import javax.inject.Singleton
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    /**
     * URL base da API
     * TODO: Mover para BuildConfig ou DataStore para configurar em runtime
     */
    @Provides
    @Singleton
    @Named("BaseUrl")
    fun provideBaseUrl(): String {
        // Em desenvolvimento, usar 10.0.2.2 para acessar localhost do host no emulador
        // Em produção, usar a URL real do servidor
        return "http://10.0.2.2:3004/api/"
    }

    /**
     * Gson configurado
     */
    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder()
            .setLenient()
            .create()
    }

    /**
     * OkHttpClient com logging e timeout
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        @Named("BaseUrl") baseUrl: String
    ): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Retrofit configurado
     */
    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        gson: Gson,
        @Named("BaseUrl") baseUrl: String
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    /**
     * ApiService
     */
    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }

    /**
     * AuthRepository
     */
    @Provides
    @Singleton
    fun provideAuthRepository(apiService: ApiService, tokenManager: TokenManager): AuthRepository {
        return AuthRepository(apiService, tokenManager)
    }

    /**
     * TokenManager
     */
    @Provides
    @Singleton
    fun provideTokenManager(@Named("AppContext") context: Context): TokenManager {
        return TokenManager(context)
    }
}