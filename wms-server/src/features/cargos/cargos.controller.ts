import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CargosService } from './cargos.service.js';
import { CreateCargoDto } from './dto/create-cargo.dto.js';
import { UpdateCargoDto } from './dto/update-cargo.dto.js';
import { ListCargosQueryDto } from './dto/list-cargos-query.dto.js';
import { CargoResponseDto } from './dto/cargo-response.dto.js';
import { CargoListItemDto } from './dto/cargo-list-item.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { ApiPaginatedResponse } from '../../core/utils/paginated-response.js';
import { CargoStatusService } from './cargo-status.service.js';
import { ReopenCargoDto } from './dto/reopen-cargo.dto.js';
import { DepartCargoDto } from './dto/depart-cargo.dto.js';

@ApiTags('Cargas')
@ApiBearerAuth()
@Controller('cargos')
export class CargosController {
  constructor(
    private readonly cargosService: CargosService,
    private readonly cargoStatusService: CargoStatusService,
  ) {}

  @Post(':id/depart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Expede uma carga',
    description:
      'Só com a carga em carregamento e ao menos um volume carregado. Com volumes pendentes, é preciso enviar `force: true`; sem isso responde 409 com `pendingVolumes`. Depois de expedida, a carga fica travada até ser reaberta.',
  })
  @ApiOkResponse({ description: 'Carga expedida', type: CargoResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Carga não encontrada' })
  @ApiConflictResponse({
    description:
      'Carga fora de carregamento, sem volumes carregados ou com volumes pendentes sem confirmação',
  })
  depart(
    @Param('id', ParseIntPipe) id: number,
    @Body() departCargoDto: DepartCargoDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.cargoStatusService.depart(id, departCargoDto, userId, actor);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reabre uma carga expedida',
    description:
      'Volta a carga para o carregamento, para corrigir bipagens ou a estrutura, e limpa os dados da expedição. O motivo é obrigatório e fica registrado no log.',
  })
  @ApiOkResponse({ description: 'Carga reaberta', type: CargoResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Carga não encontrada' })
  @ApiConflictResponse({ description: 'A carga não está expedida' })
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Body() reopenCargoDto: ReopenCargoDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.cargoStatusService.reopen(id, reopenCargoDto, actor);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista as cargas com paginação',
    description:
      'Sem `createdFrom` e `createdTo`, retorna as cargas criadas no dia atual (fuso America/Sao_Paulo). A busca aceita ordem de carga, motorista ou caminhão. Cada carga traz o total de volumes e quantos já foram carregados.',
  })
  @ApiPaginatedResponse(CargoListItemDto, 'Lista paginada de cargas')
  @ApiBadRequestResponse({ description: 'Parâmetros de consulta inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  findAll(
    @Query() query: ListCargosQueryDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.cargosService.findAll(query, actor);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retorna uma carga pelo id',
    description: 'Inclui os romaneios, com o snapshot do cliente, e os itens.',
  })
  @ApiOkResponse({ description: 'Dados da carga', type: CargoResponseDto })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Carga não encontrada' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.cargosService.findOne(id, actor);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra uma carga',
    description:
      'Cria a carga, os romaneios, os itens e os volumes em uma única transação. Cada item gera de 1 a `volumeCount` volumes (1 quando vazio). O cliente de cada romaneio é gravado como snapshot: informe `clientId` ou os dados em `client`. Com `document`, o cadastro de clientes é reaproveitado ou criado.',
  })
  @ApiCreatedResponse({ description: 'Carga criada', type: CargoResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Cliente informado não encontrado' })
  @ApiConflictResponse({
    description: 'Ordem de carga ou número de romaneio já cadastrado',
  })
  create(
    @Body() createCargoDto: CreateCargoDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.cargosService.create(createCargoDto, actor);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita uma carga',
    description:
      'Todos os campos são opcionais. Cabeçalho, romaneios, itens, quantidades e volumes podem ser alterados com a carga aberta ou em carregamento, mas sem remover ou reduzir volumes já carregados (estorne antes em `POST /scans/undo`). Carga expedida não pode ser editada: reabra antes. Quando enviado, `deliveries` é a lista completa: com `id` mantém, sem `id` cria e o que não vier é removido.',
  })
  @ApiOkResponse({ description: 'Carga atualizada', type: CargoResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Carga ou cliente não encontrado' })
  @ApiConflictResponse({
    description:
      'Edição não permitida para o status atual da carga, ou ordem de carga e número de romaneio já cadastrados',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCargoDto: UpdateCargoDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.cargosService.update(id, updateCargoDto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui uma carga',
    description:
      'Exclusão definitiva, junto com romaneios, itens e volumes. Só é possível com a carga aberta e sem volumes carregados.',
  })
  @ApiNoContentResponse({ description: 'Carga excluída' })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Carga não encontrada' })
  @ApiConflictResponse({
    description: 'Carga não está aberta ou tem volumes já carregados',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.cargosService.remove(id, actor);
  }
}
