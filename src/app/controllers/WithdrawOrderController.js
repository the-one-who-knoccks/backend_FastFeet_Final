import * as Yup from 'yup';
import { Op } from 'sequelize';
import {
  startOfDay,
  endOfDay,
  parseISO,
  isBefore,
  setHours,
  isWithinInterval,
} from 'date-fns';
import Order from '../models/Order';

class WithDrawOrderController {
  async update(req, res) {
    const schema = Yup.object().shape({
      start_date: Yup.date().required(),
    });
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation failed.' });
    }
    const { id, order_id } = req.params;
    const { start_date } = req.body;

    const order = await Order.findByPk(order_id);

    if (order.canceled_at) {
      return res.status(401).json({
        error: 'This order has already been cancelled.',
      });
    }

    if (Number(id) !== order.deliveryman_id) {
      return res.status(401).json({
        error: "You don't have permission to withdraw this order.",
      });
    }

    if (isBefore(start_date, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted.' });
    }

    const parsedStartDate = parseISO(start_date);

    const startHourDate = setHours(parsedStartDate, 8);
    const endHourDate = setHours(parsedStartDate, 18);

    if (
      !isWithinInterval(parsedStartDate, {
        start: startHourDate,
        end: endHourDate,
      })
    ) {
      return res
        .status(400)
        .json({ error: 'You can only withdraw between 8 AM and 18 PM.' });
    }

    const withdraws = await Order.findAll({
      where: {
        deliveryman_id: id,
        canceled_at: null,
        end_date: null,
        start_date: {
          [Op.between]: [
            startOfDay(parsedStartDate),
            endOfDay(parsedStartDate),
          ],
        },
      },
    });

    if (withdraws.length >= 5) {
      return res.status(401).json({
        error: 'You can only withdraw orders 5 times a day.',
      });
    }

    order.start_date = start_date;

    await order.save();

    const { id: deliveryman_id, product, recipient_id } = order;
    return res.json({
      id,
      product,
      recipient_id,
      deliveryman_id,
      start_date,
    });
  }
}

export default new WithDrawOrderController();
