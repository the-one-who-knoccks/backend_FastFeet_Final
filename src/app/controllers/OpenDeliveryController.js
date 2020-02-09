import Order from '../models/Order';

class OpenDeliveryController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const { id } = req.params;

    const openOrders = await Order.findAll({
      where: {
        deliveryman_id: Number(id),
        canceled_at: null,
        end_date: null,
      },
      limit: 20,
      offset: (page - 1) * 20,
      attributes: [
        'id',
        'product',
        'start_date',
        'recipient_id',
        'deliveryman_id',
        'signature_id',
      ],
    });

    return res.json(openOrders);
  }
}

export default new OpenDeliveryController();
