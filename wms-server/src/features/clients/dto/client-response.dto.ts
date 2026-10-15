import { ApiProperty } from '@nestjs/swagger';

export class ClientResponseDto {
  @ApiProperty({ description: 'Id do cliente', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Nome do cliente',
    example: 'Prefeitura de Espinosa',
  })
  name: string;

  @ApiProperty({
    description: 'CPF ou CNPJ, somente dígitos',
    example: '12345678000195',
    nullable: true,
    type: String,
  })
  document: string | null;

  @ApiProperty({ description: 'Endereço', nullable: true, type: String })
  address: string | null;

  @ApiProperty({ description: 'Bairro', nullable: true, type: String })
  neighborhood: string | null;

  @ApiProperty({ description: 'Cidade', example: 'Espinosa' })
  city: string;

  @ApiProperty({
    description: 'UF com 2 letras',
    example: 'MG',
    nullable: true,
    type: String,
  })
  state: string | null;

  @ApiProperty({
    description: 'CEP, somente dígitos',
    example: '39400000',
    nullable: true,
    type: String,
  })
  zipCode: string | null;

  @ApiProperty({ description: 'Telefone', nullable: true, type: String })
  phone: string | null;

  constructor(partial: Partial<ClientResponseDto>) {
    Object.assign(this, partial);
  }
}
