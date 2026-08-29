import { IsArray, IsIn, IsString } from 'class-validator';

export class SetEnabledDto {
  @IsArray()
  @IsString({ each: true })
  filterIds!: string[];
}
