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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { ApiPaginatedResponse } from '../../core/utils/paginated-response.js';

@ApiTags('Produtos')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os produtos com paginação',
    description:
      'A busca aceita nome ou código (id). Por padrão retorna só ativos; use `active=false` para os inativos.',
  })
  @ApiPaginatedResponse(ProductResponseDto, 'Lista paginada de produtos')
  @ApiBadRequestResponse({ description: 'Parâmetros de consulta inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  findAll(
    @Query() query: ListProductsQueryDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.productsService.findAll(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retorna um produto ativo pelo id' })
  @ApiOkResponse({ description: 'Dados do produto', type: ProductResponseDto })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Produto não encontrado' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.productsService.findOne(id, actor);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um produto',
    description: 'O código do produto é o id, gerado automaticamente.',
  })
  @ApiCreatedResponse({
    description: 'Produto criado',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.productsService.create(createProductDto, actor);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita um produto',
    description:
      'Todos os campos são opcionais. Enviar `null` em peso ou volumes limpa o valor.',
  })
  @ApiOkResponse({
    description: 'Produto atualizado',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Produto não encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.productsService.update(id, updateProductDto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desativa um produto',
    description:
      'Soft delete (`active=false`). Os itens já criados mantêm o snapshot de código, nome, peso e volumes.',
  })
  @ApiNoContentResponse({ description: 'Produto desativado' })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Produto não encontrado' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.productsService.remove(id, actor);
  }
}
