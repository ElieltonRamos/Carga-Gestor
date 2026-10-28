// dto/update-company-logo.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class UpdateCompanyLogoDto {
  @ApiProperty({
    description: 'Imagem PNG ou JPEG como data URL em base64',
    example: 'data:image/png;base64,iVBORw0KGgo...',
  })
  @IsString()
  @MaxLength(90_000)
  @Matches(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/, {
    message: 'Logo deve ser uma imagem PNG ou JPEG em base64',
  })
  logo: string;
}
