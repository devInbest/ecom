import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import PrivateRoute from './components/common/PrivateRoute';
import PermissionRoute from './components/common/PermissionRoute';
import Layout from './components/common/Layout';

const Login = lazy(() => import('./pages/Auth/Login'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const AcceptInvitation = lazy(() => import('./pages/Auth/AcceptInvitation'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProductList = lazy(() => import('./pages/Products/ProductList'));
const ProductForm = lazy(() => import('./pages/Products/ProductForm'));
const ProductDetail = lazy(() => import('./pages/Products/ProductDetail'));
const CategoryList = lazy(() => import('./pages/Categories/CategoryList'));
const SubcategoryList = lazy(() => import('./pages/Subcategories/SubcategoryList'));
const OrderList = lazy(() => import('./pages/Orders/OrderList'));
const Settings = lazy(() => import('./pages/Settings/Settings'));

const LayoutWrapper = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
  </div>
);

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route
        path="/login"
        element={(
          <Suspense fallback={<PageFallback />}>
            <Login />
          </Suspense>
        )}
      />
      <Route
        path="/forgot-password"
        element={(
          <Suspense fallback={<PageFallback />}>
            <ForgotPassword />
          </Suspense>
        )}
      />
      <Route
        path="/reset-password"
        element={(
          <Suspense fallback={<PageFallback />}>
            <ResetPassword />
          </Suspense>
        )}
      />
      <Route
        path="/accept-invitation"
        element={(
          <Suspense fallback={<PageFallback />}>
            <AcceptInvitation />
          </Suspense>
        )}
      />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      <Route element={<PrivateRoute />}>
        <Route element={<LayoutWrapper />}>
          <Route
            path="/"
            element={(
              <Suspense fallback={null}>
                <Dashboard />
              </Suspense>
            )}
          />
          <Route element={<PermissionRoute anyOf={['product:create', 'catalog.product.create']} />}>
            <Route
              path="/products/new"
              element={(
                <Suspense fallback={null}>
                  <ProductForm />
                </Suspense>
              )}
            />
          </Route>
          <Route element={<PermissionRoute anyOf={['product:update', 'catalog.product.update']} />}>
            <Route
              path="/products/:id/edit"
              element={(
                <Suspense fallback={null}>
                  <ProductForm />
                </Suspense>
              )}
            />
          </Route>
          <Route element={<PermissionRoute anyOf={['product:read', 'catalog.product.read']} />}>
            <Route
              path="/products"
              element={(
                <Suspense fallback={null}>
                  <ProductList />
                </Suspense>
              )}
            />
            <Route
              path="/products/:id"
              element={(
                <Suspense fallback={null}>
                  <ProductDetail />
                </Suspense>
              )}
            />
          </Route>
          <Route element={<PermissionRoute anyOf={['category:read', 'catalog.category.read']} />}>
            <Route
              path="/categories"
              element={(
                <Suspense fallback={null}>
                  <CategoryList />
                </Suspense>
              )}
            />
          </Route>
          <Route element={<PermissionRoute anyOf={['subcategory:read', 'catalog.subcategory.read', 'category:read']} />}>
            <Route
              path="/subcategories"
              element={(
                <Suspense fallback={null}>
                  <SubcategoryList />
                </Suspense>
              )}
            />
          </Route>
          <Route element={<PermissionRoute anyOf={['order:read']} />}>
            <Route
              path="/orders"
              element={(
                <Suspense fallback={null}>
                  <OrderList />
                </Suspense>
              )}
            />
          </Route>
          <Route
            path="/settings"
            element={(
              <Suspense fallback={null}>
                <Settings />
              </Suspense>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
