import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Custom Validation Pipe
 * Enhanced validation with better error messages
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
    });

    if (errors.length > 0) {
      const errorMessages = this.formatErrors(errors);
      throw new BadRequestException({
        success: false,
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: errorMessages,
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    errors.forEach((error) => {
      const property = error.property;
      const constraints = error.constraints || {};

      formatted[property] = Object.values(constraints);
    });

    return formatted;
  }
}



