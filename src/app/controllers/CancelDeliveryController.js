import { Op } from 'sequelize';
import Queue from '../../lib/Queue';
import Order from '../models/Order';
import Recipient from '../models/Recipient';
import CancelOrder from '../jobs/CancelOrder';
import Deliveryman from '../models/Deliveryman';
import DeliveryProblem from '../models/DeliveryProblem';

class CancelDeliveryController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const { id } = req.params;

    const canceledOrders = await Order.findAll({
      where: {
        deliveryman_id: id,
        canceled_at: {
          [Op.ne]: null,
        },
      },
      limit: 20,
      offset: (page - 1) * 20,
      attributes: [
        'id',
        'product',
        'start_date',
        'canceled_at',
        'recipient_id',
        'deliveryman_id',
        'signature_id',
      ],
    });

    return res.json(canceledOrders);
  }

  async update(req, res) {
    const { id: problem_id } = req.params;

    const problem = await DeliveryProblem.findByPk(problem_id);

    const order = await Order.findByPk(problem.delivery_id);

    if (!order) {
      return res.status(401).json({
        error: 'This problem belongs to no order.',
      });
    }

    if (order.canceled_at) {
      return res.status(401).json({
        error: 'This order has already been cancelled.',
      });
    }

    if (order.end_date) {
      return res.status(401).json({
        error: 'This order has already been delivered.',
      });
    }

    order.canceled_at = new Date();
    await order.save();

    const { description } = problem;

    const { id, deliveryman_id, product, recipient_id, canceled_at } = order;

    const recipientExists = await Recipient.findByPk(recipient_id);
    const deliveymanExists = await Deliveryman.findByPk(deliveryman_id);

    if (!deliveymanExists) {
      return res.status(400).json({ error: 'Deliveryman does not exists.' });
    }

    if (!recipientExists) {
      return res.status(400).json({ error: 'Recipient does not exists.' });
    }

    const { name: recipient_name } = recipientExists;
    const { name: deliveryman_name } = deliveymanExists;

    const cancelOrder = {
      deliveryman_name,
      recipient_name,
      product,
      description,
      canceled_at,
    };

    await Queue.add(CancelOrder.key, {
      cancelOrder,
    });

    return res.json({
      id,
      deliveryman_name,
      recipient_name,
      product,
      description,
      canceled_at,
    });
  }
}

export default new CancelDeliveryController();
