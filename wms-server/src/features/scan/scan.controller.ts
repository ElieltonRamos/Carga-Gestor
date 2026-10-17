import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ScanRequestDto } from './dto/scan-request.dto.js';
import { ScanResponseDto } from './dto/scan-response.dto.js';
import { ListScansQueryDto } from './dto/list-scans-query.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { ScansService } from './scan.service.js';
import { ScanLogResponseDto } from './dto/scan-log-response.dto.js';
import { ApiPaginatedResponse } from '../../core/utils/paginated-response.js';

// Identificador declarado pelo aparelho, usado só para rastreio
const toDevice = (deviceId?: string) => deviceId?.trim().slice(0, 100) || null;

@ApiTags('Conferência')
@ApiBearerAuth()
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registra a bipagem de um volume',
    description:
      'Sempre responde 200 quando a carga existe. O resultado da leitura vem em `result` (`OK`, `WARNING` ou `ERROR`) e o motivo da recusa em `reason`. A primeira bipagem aceita inicia o carregamento, e o último volume preenche o fim do carregamento.',
  })
  @ApiHeader({
    name: 'x-device-id',
    required: false,
    description: 'Identificador do aparelho que fez a leitura',
  })
  @ApiOkResponse({ description: 'Resultado da bipagem', type: ScanResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Carga não encontrada' })
  scan(
    @Body() scanRequestDto: ScanRequestDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('username') actor: string,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.scansService.scan(
      scanRequestDto,
      userId,
      actor,
      toDevice(deviceId),
    );
  }

  @Post('undo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desfaz a bipagem de um volume',
    description:
      'Só vale para carga aberta ou em carregamento e para volume já carregado. Limpa o carregamento do volume e, se a carga estava completa, o fim do carregamento. O status da carga não volta para `OPEN`.',
  })
  @ApiHeader({
    name: 'x-device-id',
    required: false,
    description: 'Identificador do aparelho que fez a operação',
  })
  @ApiOkResponse({ description: 'Bipagem desfeita', type: ScanResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Carga ou volume não encontrado' })
  @ApiConflictResponse({
    description:
      'Carga já expedida, volume de outra carga ou volume ainda não carregado',
  })
  undo(
    @Body() scanRequestDto: ScanRequestDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('username') actor: string,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.scansService.undo(
      scanRequestDto,
      userId,
      actor,
      toDevice(deviceId),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Lista o histórico de bipagens com paginação',
    description:
      'Sem `createdFrom` e `createdTo`, lista todo o histórico. O período usa o fuso America/Sao_Paulo.',
  })
  @ApiPaginatedResponse(ScanLogResponseDto, 'Lista paginada de bipagens')
  @ApiBadRequestResponse({ description: 'Parâmetros de consulta inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  findAll(
    @Query() query: ListScansQueryDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.scansService.findAll(query, actor);
  }
}
