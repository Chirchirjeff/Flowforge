import { Controller, Post, UseGuards, Request, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/v1/auth/login — email + password → JWT */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: { user: { id: string; email: string } }) {
    return this.authService.login(req.user);
  }

  /** GET /api/v1/auth/me — returns the current user from JWT */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: unknown }) {
    return req.user;
  }
}
