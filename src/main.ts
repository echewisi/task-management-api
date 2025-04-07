import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   // Swagger Configuration
   const config = new DocumentBuilder()
   .setTitle('task management API')
   .setDescription('API documentation for task management api')
   .setVersion('1.0')
   .addBearerAuth(
     {
       type: 'http',
       scheme: 'bearer',
       bearerFormat: 'JWT',
       in: 'header',
       name: 'Authorization',
       description: 'Enter your Bearer token',
     },
     'bearer',
   )
   .addSecurityRequirements('bearer')
   .build();

 const document = SwaggerModule.createDocument(app, config);
 SwaggerModule.setup('docs', app, document);

 await app.listen(process.env.PORT ?? 3000);
 console.log('🚀 Server running on http://localhost:3000');
 console.log('📄 Swagger Docs available at http://localhost:3000/docs');

}
bootstrap();
