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
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { ListClientsQueryDto } from './dto/list-clients-query.dto.js';
import { ClientResponseDto } from './dto/client-response.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { ApiPaginatedResponse } from '../../core/utils/paginated-response.js';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os clientes com paginação',
    description: 'A busca aceita nome ou documento.',
  })
  @ApiPaginatedResponse(ClientResponseDto, 'Lista paginada de clientes')
  @ApiBadRequestResponse({ description: 'Parâmetros de consulta inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  findAll(
    @Query() query: ListClientsQueryDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.clientsService.findAll(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retorna um cliente pelo id' })
  @ApiOkResponse({ description: 'Dados do cliente', type: ClientResponseDto })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.clientsService.findOne(id, actor);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um cliente',
    description:
      'O documento (CPF ou CNPJ) é opcional, mas deve ser único quando informado.',
  })
  @ApiCreatedResponse({
    description: 'Cliente criado',
    type: ClientResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiConflictResponse({
    description: 'Já existe um cliente cadastrado com este documento',
  })
  create(
    @Body() createClientDto: CreateClientDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.clientsService.create(createClientDto, actor);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita um cliente',
    description:
      'Todos os campos são opcionais. Enviar `null` ou texto vazio em um campo opcional limpa o valor.',
  })
  @ApiOkResponse({
    description: 'Cliente atualizado',
    type: ClientResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({
    description: 'Já existe um cliente cadastrado com este documento',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.clientsService.update(id, updateClientDto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui um cliente',
    description: 'Não é possível excluir um cliente com entregas vinculadas.',
  })
  @ApiNoContentResponse({ description: 'Cliente excluído' })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  @ApiConflictResponse({
    description: 'Cliente com entregas vinculadas',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.clientsService.remove(id, actor);
  }
}
