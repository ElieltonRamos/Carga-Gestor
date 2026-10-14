/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/modules/license-system/license-system.service.ts

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import {
  LicenseStatus,
  LicenseTokenPayload,
} from './entities/license-system.entity';
import { version } from '../../../package.json';
import { PrismaService } from '../../core/database/prisma.service';

const DAY_MS = 1000 * 60 * 60 * 24;

interface ValidationContext {
  user: string;
  startedAt: number;
}

interface FetchTokenResult {
  success: boolean;
  token?: string;
  serverRejected: boolean;
  reason?: string;
}

@Injectable()
export class LicenseSystemService {
  private readonly logger = new Logger(LicenseSystemService.name);
  private readonly licensingServer =
    'https://licensing-service-blue-pdv.vercel.app';
  publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyIWwh09J45ZEL1yM2bbD
YzEL/X+Kq06HCMClCu0MGBAGwsi6rYN+PKH3B3YBZsAG4TW3jCOdE5F5Ekb4gqP8
AsWxLt4rsKW3GavYZm8hbkldh43GPgcgr3+7pojSNz4pcUDtJM24JN/COTS5loCZ
CD3oPQ2QIQTerGEN0jlTWxOz6bXih0BX603jjIFNFoSo4JUjmC6RGPNyvGXxfqhN
mMmqHKLIcU9Vy7aYfsR5UTA8rAPN1+FLcOtfqYopejIx+dyqIYdjPwSi3RJB4hyc
kfKw2XUE5yzIIuakjISSYlN8vvv2WlNh1xoJyp/Jj0cZL58JArn4nW+NvU7d0ZBn
rwIDAQAB
-----END PUBLIC KEY-----`;

  private readonly usageReportTimeoutMs = 5000;
  private lastUsageReportDay: string | null = null;

  // Tolerância para pequenas diferenças de relógio entre a última atividade
  // registrada e a validação
  private readonly clockToleranceMs = 5 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  private expiredStatus(message?: string): LicenseStatus {
    return { isValid: false, plan: 'none', mode: 'expired', message };
  }

  // Registra o desfecho da validação em uma única linha, com usuário e duração.
  // Online sem ressalvas = log; offline, próxima do vencimento ou inválida = warn
  private conclude(
    status: LicenseStatus,
    ctx: ValidationContext,
    reason?: string,
  ): LicenseStatus {
    const details = [
      `user=${ctx.user}`,
      `modo=${status.mode}`,
      `plano=${status.plan}`,
      status.daysRemaining !== undefined
        ? `diasRestantes=${status.daysRemaining}`
        : null,
      reason ? `motivo=${reason}` : null,
      `${Date.now() - ctx.startedAt}ms`,
    ]
      .filter(Boolean)
      .join(' ');

    if (status.isValid && status.mode === 'online' && !status.message) {
      this.logger.log(`Licença validada: ${details}`);
    } else if (status.isValid) {
      this.logger.warn(`Licença válida com ressalva: ${details}`);
    } else {
      this.logger.warn(`Licença inválida: ${details}`);
    }

    return status;
  }

  private async fetchToken(
    cnpj: string,
    licenseKey: string,
  ): Promise<FetchTokenResult> {
    try {
      const response = await axios.get(
        `${this.licensingServer}/api/license/${cnpj}`,
        {
          params: { licenseKey },
          timeout: 10000,
        },
      );

      if (response.data.licenseToken) {
        return {
          success: true,
          token: response.data.licenseToken,
          serverRejected: false,
        };
      }

      return {
        success: false,
        serverRejected: true,
        reason: 'resposta sem licenseToken',
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;

        // Só 4xx é rejeição explícita. 5xx (servidor/proxy fora), 408 e 429
        // são tratados como indisponibilidade e mantêm o token em cache.
        const rejected =
          status >= 400 && status < 500 && status !== 408 && status !== 429;

        return {
          success: false,
          serverRejected: rejected,
          reason: `HTTP ${status}`,
        };
      }

      // Sem resposta (timeout, DNS, rede fora) = falha de rede, não rejeição
      return {
        success: false,
        serverRejected: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private verifyToken(token: string): LicenseTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'blue-pdv-licensing',
        ignoreExpiration: true, // exp é tratado manualmente em checkToken
      }) as jwt.JwtPayload;

      const payload: LicenseTokenPayload = {
        companyId: Number(decoded.companyId),
        cnpj: String(decoded.cnpj),
        plan: decoded.plan as 'basic' | 'pro',
        licenseValidUntil: Number(decoded.licenseValidUntil),
        maxOfflineDays: Number(decoded.maxOfflineDays),
        iat: Number(decoded.iat),
        exp: Number(decoded.exp),
      };

      // Claim ausente ou inválido vira NaN e faria as comparações de data
      // retornarem sempre false (licença válida para sempre)
      const numericClaims = [
        payload.companyId,
        payload.licenseValidUntil,
        payload.maxOfflineDays,
        payload.iat,
        payload.exp,
      ];

      if (!numericClaims.every((value) => Number.isFinite(value))) {
        return null;
      }

      if (payload.plan !== 'basic' && payload.plan !== 'pro') {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private isTokenForCompany(token: string, cnpj: string): boolean {
    const payload = this.verifyToken(token);
    return !!payload && payload.cnpj === cnpj;
  }

  private graceDaysRemaining(
    payload: LicenseTokenPayload,
    sinceMs: number,
    now: number,
  ): number {
    const elapsedDays = Math.max(0, Math.floor((now - sinceMs) / DAY_MS));
    return payload.maxOfflineDays - elapsedDays;
  }

  private checkToken(
    token: string,
    cnpj: string,
    cached = false,
  ): LicenseStatus {
    const payload = this.verifyToken(token);

    if (!payload || payload.cnpj !== cnpj) {
      return this.expiredStatus();
    }

    const now = Date.now();
    const licenseExpired = now > payload.licenseValidUntil;

    // Licença expirada — grace period conta a partir do vencimento da licença
    if (licenseExpired) {
      const daysRemaining = this.graceDaysRemaining(
        payload,
        payload.licenseValidUntil,
        now,
      );

      if (daysRemaining > 0) {
        return {
          isValid: true,
          plan: payload.plan,
          mode: 'offline',
          daysRemaining,
          message: `Licença expirada. Sistema em modo offline. ${daysRemaining} dia(s) restante(s) para regularizar.`,
        };
      }

      return this.expiredStatus();
    }

    // Sem conexão (token do cache) — tolerância conta a partir da última
    // sincronização com o servidor (iat)
    if (cached) {
      const daysRemaining = this.graceDaysRemaining(
        payload,
        payload.iat * 1000,
        now,
      );

      if (daysRemaining > 0) {
        return {
          isValid: true,
          plan: payload.plan,
          mode: 'offline',
          daysRemaining,
          message: `Sistema em modo offline. ${daysRemaining} dia(s) restante(s) para reconectar.`,
        };
      }

      return this.expiredStatus();
    }

    // Online válida — verifica se está próxima de vencer (3 dias)
    const msUntilExpiry = payload.licenseValidUntil - now;
    const daysUntilExpiry = Math.ceil(msUntilExpiry / DAY_MS);

    if (daysUntilExpiry <= 3) {
      return {
        isValid: true,
        plan: payload.plan,
        mode: 'online',
        daysRemaining: daysUntilExpiry,
        message: `Sua licença vence em ${daysUntilExpiry} dia(s). Renove para evitar interrupções.`,
      };
    }

    return { isValid: true, plan: payload.plan, mode: 'online' };
  }

  // Usa as duas últimas bipagens e as duas últimas cargas como marco de tempo:
  // se o relógio atual está anterior a elas, a data do computador foi voltada
  private async isClockRolledBack(): Promise<boolean> {
    const [lastScans, lastCargos] = await Promise.all([
      this.prisma.client.scanLog.findMany({
        select: { createdAt: true },
        orderBy: { id: 'desc' },
        take: 2,
      }),
      this.prisma.client.cargo.findMany({
        select: { createdAt: true },
        orderBy: { id: 'desc' },
        take: 2,
      }),
    ]);

    const dates = [...lastScans, ...lastCargos].map((row) =>
      row.createdAt.getTime(),
    );

    if (dates.length === 0) return false;

    return Date.now() + this.clockToleranceMs < Math.max(...dates);
  }

  async validate(username?: string): Promise<LicenseStatus> {
    const ctx: ValidationContext = {
      user: username ?? 'n/d',
      startedAt: Date.now(),
    };

    const company = await this.prisma.client.company.findFirst();

    if (!company) {
      this.logger.error(
        `Validação de licença abortada: empresa não cadastrada (user=${ctx.user})`,
      );
      throw new HttpException('Empresa não encontrada', HttpStatus.NOT_FOUND);
    }

    const { cnpj, licenseKey, licenseToken } = company;

    if (!licenseKey) {
      return this.conclude(
        this.expiredStatus(),
        ctx,
        'licenseKey não configurada',
      );
    }

    const result = await this.fetchToken(cnpj, licenseKey);

    // Sucesso online - atualiza token e retorna
    if (result.success && result.token) {
      if (!this.isTokenForCompany(result.token, cnpj)) {
        return this.conclude(
          this.expiredStatus(),
          ctx,
          'token recebido inválido ou de outro CNPJ',
        );
      }

      await this.prisma.client.company.update({
        where: { id: company.id },
        data: { licenseToken: result.token },
      });
      return this.conclude(this.checkToken(result.token, cnpj), ctx);
    }

    // Servidor rejeitou explicitamente (4xx) - limpa token e invalida
    if (result.serverRejected) {
      await this.prisma.client.company.update({
        where: { id: company.id },
        data: { licenseToken: '' },
      });
      return this.conclude(
        this.expiredStatus(),
        ctx,
        `servidor rejeitou a licença (${result.reason}); token local removido`,
      );
    }

    // Falha de rede - mantém token atual e cai no cache (respeita maxOfflineDays)
    const failure = `servidor indisponível (${result.reason}), usando cache`;

    if (!licenseToken) {
      return this.conclude(
        this.expiredStatus(),
        ctx,
        `${failure}; sem token em cache`,
      );
    }

    if (await this.isClockRolledBack()) {
      return this.conclude(
        this.expiredStatus(
          'Não foi possível validar a licença. Conecte-se à internet para regularizar.',
        ),
        ctx,
        `${failure}; relógio do sistema anterior à última atividade registrada`,
      );
    }

    return this.conclude(
      this.checkToken(licenseToken, cnpj, true),
      ctx,
      failure,
    );
  }

  async getStatus(username?: string): Promise<LicenseStatus> {
    return this.validate(username);
  }

  async getTokenInfo(): Promise<LicenseTokenPayload> {
    const company = await this.prisma.client.company.findFirst();

    if (!company || !company.licenseToken) {
      throw new HttpException('Token não encontrado', HttpStatus.NOT_FOUND);
    }

    const payload = this.verifyToken(company.licenseToken);

    if (!payload || payload.cnpj !== company.cnpj) {
      throw new HttpException('Token inválido', HttpStatus.BAD_REQUEST);
    }

    return payload;
  }

  // Data local (do processo) no formato YYYY-MM-DD
  private getLocalDay(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private async collectUsage(): Promise<Record<string, number>> {
    const rows = await this.prisma.client.$queryRaw<
      { tabela: string; linhas: bigint | number | null }[]
    >`
      SELECT CAST(TABLE_NAME AS CHAR) AS tabela, TABLE_ROWS AS linhas
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME <> '_prisma_migrations'
      ORDER BY TABLE_NAME
    `;

    return Object.fromEntries(
      rows.map((row) => [row.tabela, Number(row.linhas ?? 0)]),
    );
  }

  // Nunca lança erro: pode ser chamado sem await
  async sendUsageReport(force = false): Promise<void> {
    const today = this.getLocalDay();

    if (!force && this.lastUsageReportDay === today) {
      return;
    }

    // Marca antes de executar para evitar disparos simultâneos
    this.lastUsageReportDay = today;

    try {
      const company = await this.prisma.client.company.findFirst();

      if (!company || !company.licenseKey) {
        this.logger.warn(
          'Resumo de uso não enviado: empresa ou licenseKey ausente',
        );
        return;
      }

      const usage = await this.collectUsage();

      await axios.post(
        `${this.licensingServer}/api/usage-report`,
        {
          cnpj: company.cnpj,
          licenseKey: company.licenseKey,
          loginAt: new Date().toISOString(),
          version,
          usage,
        },
        { timeout: this.usageReportTimeoutMs },
      );

      this.logger.log(
        `Resumo de uso enviado (${Object.keys(usage).length} tabelas)`,
      );
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      const retryable = !status || status >= 500;

      // Libera nova tentativa no mesmo dia só se a falha for transitória
      if (!force && retryable) this.lastUsageReportDay = null;

      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao enviar resumo de uso: ${reason}`);
    }
  }
}
