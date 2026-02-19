import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe | null = null;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private businessService: BusinessService,
    private subscriptionsService: SubscriptionsService,
  ) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      (this as unknown as { stripe: Stripe }).stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2026-01-28.clover',
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set, Stripe functionality disabled');
    }
  }

  async createCheckoutSession(
    userId: string,
    planType: 'SOLO' | 'SMALL_TEAM',
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const business = await this.businessService.findByUserId(userId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const priceMap = {
      SOLO: process.env.STRIPE_PRICE_ID_SOLO || 'price_solo',
      SMALL_TEAM: process.env.STRIPE_PRICE_ID_SMALL_TEAM || 'price_small_team',
    };

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceMap[planType],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings/subscription?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings/subscription?canceled=true`,
      customer_email: (business as any).user?.email,
      metadata: {
        businessId: business.id,
        userId,
        planType,
      },
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  async handleWebhook(payload: string, signature: string) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not set');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Webhook signature verification failed:', err);
      throw new Error('Webhook signature verification failed');
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await this.handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await this.handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSubscription = event.data.object;
        await this.handleSubscriptionDeleted(deletedSubscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        this.handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object;
        await this.handlePaymentFailed(failedInvoice);
        break;
      }

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const businessId = session.metadata?.businessId;
    const planType = session.metadata?.planType as 'SOLO' | 'SMALL_TEAM';

    if (!businessId || !planType) {
      this.logger.error('Missing metadata in checkout session');
      return;
    }

    const subscriptionId = session.subscription as string;

    // Update subscription in database
    await this.subscriptionsService.updateSubscription(
      session.metadata?.userId || '',
      planType,
      subscriptionId,
    );

    this.logger.log(`Subscription created for business ${businessId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // Find business by Stripe subscription ID
    const dbSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) {
      this.logger.warn(`Subscription not found for Stripe ID: ${subscription.id}`);
      return;
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELLED',
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      },
    });

    this.logger.log(`Subscription updated for business ${dbSubscription.businessId}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const dbSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) {
      return;
    }

    await this.subscriptionsService.cancelSubscription(dbSubscription.businessId);
    this.logger.log(`Subscription cancelled for business ${dbSubscription.businessId}`);
  }

  private handlePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log(`Payment succeeded for invoice ${invoice.id}`);
    // You can add additional logic here, like sending confirmation emails
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    // Stripe invoice subscription can be string ID or Subscription object
    const invoiceAny = invoice as any;
    let subscriptionId: string | null = null;

    if (typeof invoiceAny.subscription === 'string') {
      subscriptionId = invoiceAny.subscription;
    } else if (invoiceAny.subscription && typeof invoiceAny.subscription === 'object') {
      subscriptionId = invoiceAny.subscription.id;
    }

    if (!subscriptionId) {
      return;
    }

    const dbSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (dbSubscription) {
      await this.prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: { status: 'PAST_DUE' },
      });
    }

    this.logger.warn(`Payment failed for invoice ${invoice.id}`);
  }

  async createPaymentIntent(amount: number, currency: string = 'gbp') {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to pence
      currency,
    });
  }
}
