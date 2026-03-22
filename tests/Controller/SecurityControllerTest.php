<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SecurityControllerTest extends WebTestCase
{
    public function testLoginPageLoads(): void
    {
        $client = static::createClient();
        $client->request('GET', '/login');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorExists('input[name="_username"]');
        $this->assertSelectorExists('button[type="submit"]');
    }

    public function testLoginCreatesUserAndRedirects(): void
    {
        $client = static::createClient();
        $client->request('GET', '/login');

        $client->submitForm('Увійти 🚀', [
            '_username' => 'ТестовийЮзер',
        ]);

        $this->assertResponseRedirects('/');
        $client->followRedirect();
        $this->assertResponseIsSuccessful();
    }

    public function testUnauthenticatedRedirectsToLogin(): void
    {
        $client = static::createClient();
        $client->request('GET', '/');

        $this->assertResponseRedirects('/login');
    }

    public function testLoginWithEmptyNameShowsError(): void
    {
        $client = static::createClient();
        $client->request('POST', '/login', [
            '_username' => '',
        ]);

        $this->assertResponseRedirects('/login');
    }
}
