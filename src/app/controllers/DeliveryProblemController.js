import * as Yup from 'yup';
import { Op } from 'sequelize';
import Order from '../models/Order';
import Recipient from '../models/Recipient';
import Deliveryman from '../models/Deliveryman';
import DeliveryProblem from '../models/DeliveryProblem';

class DeliveryProblemController {
  async index(req, res) {
    const { id: deliveryman_id } = req.params;
    const { page = 1 } = req.query;
    const orders = await DeliveryProblem.findAll({
      limit: 20,
      offset: (page - 1) * 20,
      attributes: [],
      include: [
        {
          model: Order,
          as: 'delivery',
          attributes: ['id', 'product'],
          where: {
            id: {
              [Op.col]: 'DeliveryProblem.delivery_id',
            },
          },
          include: [
            {
              model: Deliveryman,
              as: 'deliveryman',
              where: {
                id: deliveryman_id,
              },
              attributes: ['id', 'name', 'email'],
            },
            {
              model: Recipient,
              as: 'recipient',
              attributes: ['id', 'name', 'street', 'city'],
            },
          ],
        },
      ],
    });

    return res.json(orders);
  }

  async show(req, res) {
    const { id: deliveryman_id, order_id } = req.params;

    const { page = 1 } = req.query;
    const problems = await DeliveryProblem.findAll({
      limit: 20,
      offset: (page - 1) * 20,
      attributes: ['id', 'description'],
      where: {
        delivery_id: order_id,
      },
      include: [
        {
          model: Order,
          as: 'delivery',
          attributes: [],
          include: [
            {
              model: Deliveryman,
              as: 'deliveryman',
              where: {
                id: deliveryman_id,
              },
              attributes: [],
            },
          ],
        },
      ],
    });

    return res.json(problems);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      description: Yup.string().required(),
    });
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation failed.' });
    }
    const { id, order_id } = req.params;

    const order = await Order.findByPk(order_id);

    if (Number(id) !== order.deliveryman_id) {
      return res.status(401).json({
        error: "You don't have permission to register a problem.",
      });
    }
    const { description } = req.body;

    await DeliveryProblem.create({
      description,
      delivery_id: order_id,
    });

    return res.json({
      description,
      order_id,
    });
  }
}

export default new DeliveryProblemController();
