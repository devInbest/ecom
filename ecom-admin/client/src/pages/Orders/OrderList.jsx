import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/common/CustomSelect';
import PageBanner from '../../components/common/PageBanner';
import Skeleton from '../../components/common/Skeleton';
import { ordersAPI } from '../../services/api';
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
} from '../../utils/helpers';

const OrderList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.list();
      setItems(res.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      const res = await ordersAPI.updateStatus(orderId, status);
      setItems((prev) => prev.map((order) => (order.id === orderId ? res.data : order)));
      toast.success('Order status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageBanner
        title="Orders"
        subtitle="Manage storefront orders and fulfillment status."
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No orders yet. Place a test order on the storefront to see it here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Placed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {order.user?.name || order.shippingFullName || 'Guest'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.user?.email || order.user?.phone || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="space-y-2">
                        <span className={ORDER_STATUS_COLORS[order.status] || 'badge-draft'}>
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </span>
                        <CustomSelect
                          size="sm"
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(status) => handleStatusChange(order.id, status)}
                          options={ORDER_STATUS_OPTIONS}
                          placeholder="Update status"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderList;
