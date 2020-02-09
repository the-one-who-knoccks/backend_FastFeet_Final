import * as Yup from 'yup';
import Order from '../models/Order';
import Recipient from '../models/Recipient';
import Deliveryman from '../models/Deliveryman';

import NewOrder from '../jobs/NewOrder';
import Queue from '../../lib/Queue';

class OrderController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const orders = await Order.findAll({
      limit: 20,
      offset: (page - 1) * 20,
      attributes: ['id', 'product', 'recipient_id', 'deliveryman_id'],
    });
    return res.json(orders);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      product: Yup.string().required(),
      recipient_id: Yup.number().required(),
      deliveryman_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation failed.' });
    }

    const { recipient_id, deliveryman_id } = req.body;

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

    const { id, product } = await Order.create(req.body);

    const order = {
      id,
      product,
      deliveryman_name,
      recipient_name,
    };

    await Queue.add(NewOrder.key, {
      order,
    });

    return res.json(req.body);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      product: Yup.string(),
      recipient_id: Yup.number(),
      deliveryman_id: Yup.number(),
    });
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation failed.' });
    }
    const { id } = req.params;

    const order = await Order.findByPk(id);

    const { recipient_id, deliveryman_id } = req.body;

    const recipientExists = await Recipient.findByPk(recipient_id);
    const deliveymanExists = await Deliveryman.findByPk(deliveryman_id);

    if (!deliveymanExists) {
      return res.status(400).json({ error: 'Deliveryman does not exists.' });
    }

    if (!recipientExists) {
      return res.status(400).json({ error: 'Recipient does not exists.' });
    }

    const { product } = await order.update(req.body);
    return res.json({
      id,
      product,
      recipient_id,
      deliveryman_id,
    });
  }

  async delete(req, res) {
    const { id } = req.params;
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(400).json({ error: 'Order does not exists.' });
    }

    await order.destroy();
    return res.json({
      message: `Order number ${id} was successfully deleted.`,
    });
  }
}

export default new OrderController();
