drop extension if exists "pg_net";

drop trigger if exists "update_cart_items_updated_at" on "public"."cart_items";

drop trigger if exists "update_carts_updated_at" on "public"."carts";

drop trigger if exists "update_item_options_updated_at" on "public"."item_options";

drop policy "guest access cart items by session" on "public"."cart_items";

drop policy "users manage own cart items" on "public"."cart_items";

drop policy "guest access cart by session" on "public"."carts";

drop policy "users manage own cart" on "public"."carts";

drop policy "admin manage item_options" on "public"."item_options";

drop policy "public read item_options" on "public"."item_options";

drop policy "admin manage order items" on "public"."order_items";

drop policy "admin read all order items" on "public"."order_items";

drop policy "admin read all orders" on "public"."orders";

revoke delete on table "public"."cart_items" from "anon";

revoke insert on table "public"."cart_items" from "anon";

revoke references on table "public"."cart_items" from "anon";

revoke select on table "public"."cart_items" from "anon";

revoke trigger on table "public"."cart_items" from "anon";

revoke truncate on table "public"."cart_items" from "anon";

revoke update on table "public"."cart_items" from "anon";

revoke delete on table "public"."cart_items" from "authenticated";

revoke insert on table "public"."cart_items" from "authenticated";

revoke references on table "public"."cart_items" from "authenticated";

revoke select on table "public"."cart_items" from "authenticated";

revoke trigger on table "public"."cart_items" from "authenticated";

revoke truncate on table "public"."cart_items" from "authenticated";

revoke update on table "public"."cart_items" from "authenticated";

revoke delete on table "public"."cart_items" from "service_role";

revoke insert on table "public"."cart_items" from "service_role";

revoke references on table "public"."cart_items" from "service_role";

revoke select on table "public"."cart_items" from "service_role";

revoke trigger on table "public"."cart_items" from "service_role";

revoke truncate on table "public"."cart_items" from "service_role";

revoke update on table "public"."cart_items" from "service_role";

revoke delete on table "public"."carts" from "anon";

revoke insert on table "public"."carts" from "anon";

revoke references on table "public"."carts" from "anon";

revoke select on table "public"."carts" from "anon";

revoke trigger on table "public"."carts" from "anon";

revoke truncate on table "public"."carts" from "anon";

revoke update on table "public"."carts" from "anon";

revoke delete on table "public"."carts" from "authenticated";

revoke insert on table "public"."carts" from "authenticated";

revoke references on table "public"."carts" from "authenticated";

revoke select on table "public"."carts" from "authenticated";

revoke trigger on table "public"."carts" from "authenticated";

revoke truncate on table "public"."carts" from "authenticated";

revoke update on table "public"."carts" from "authenticated";

revoke delete on table "public"."carts" from "service_role";

revoke insert on table "public"."carts" from "service_role";

revoke references on table "public"."carts" from "service_role";

revoke select on table "public"."carts" from "service_role";

revoke trigger on table "public"."carts" from "service_role";

revoke truncate on table "public"."carts" from "service_role";

revoke update on table "public"."carts" from "service_role";

revoke delete on table "public"."item_options" from "anon";

revoke insert on table "public"."item_options" from "anon";

revoke references on table "public"."item_options" from "anon";

revoke select on table "public"."item_options" from "anon";

revoke trigger on table "public"."item_options" from "anon";

revoke truncate on table "public"."item_options" from "anon";

revoke update on table "public"."item_options" from "anon";

revoke delete on table "public"."item_options" from "authenticated";

revoke insert on table "public"."item_options" from "authenticated";

revoke references on table "public"."item_options" from "authenticated";

revoke select on table "public"."item_options" from "authenticated";

revoke trigger on table "public"."item_options" from "authenticated";

revoke truncate on table "public"."item_options" from "authenticated";

revoke update on table "public"."item_options" from "authenticated";

revoke delete on table "public"."item_options" from "service_role";

revoke insert on table "public"."item_options" from "service_role";

revoke references on table "public"."item_options" from "service_role";

revoke select on table "public"."item_options" from "service_role";

revoke trigger on table "public"."item_options" from "service_role";

revoke truncate on table "public"."item_options" from "service_role";

revoke update on table "public"."item_options" from "service_role";

alter table "public"."cart_items" drop constraint "cart_items_cart_id_fkey";

alter table "public"."cart_items" drop constraint "cart_items_product_id_fkey";

alter table "public"."cart_items" drop constraint "cart_items_quantity_check";

alter table "public"."carts" drop constraint "carts_owner_check";

alter table "public"."carts" drop constraint "carts_profile_id_fkey";

alter table "public"."item_options" drop constraint "item_options_product_id_fkey";

alter table "public"."cart_items" drop constraint "cart_items_pkey";

alter table "public"."carts" drop constraint "carts_pkey";

alter table "public"."item_options" drop constraint "item_options_pkey";

drop index if exists "public"."cart_items_pkey";

drop index if exists "public"."carts_pkey";

drop index if exists "public"."idx_cart_items_cart_id";

drop index if exists "public"."idx_cart_items_product_id";

drop index if exists "public"."idx_carts_profile_id";

drop index if exists "public"."idx_carts_session_id";

drop index if exists "public"."idx_item_options_product_id";

drop index if exists "public"."idx_item_options_type";

drop index if exists "public"."idx_order_items_order_id";

drop index if exists "public"."idx_order_items_product_id";

drop index if exists "public"."idx_orders_profile_id";

drop index if exists "public"."idx_products_category_id";

drop index if exists "public"."idx_products_is_active";

drop index if exists "public"."idx_products_is_popular";

drop index if exists "public"."item_options_pkey";

drop table "public"."cart_items";

drop table "public"."carts";

drop table "public"."item_options";

alter table "public"."categories" drop column "display_order";

alter table "public"."categories" drop column "image_url";

alter table "public"."categories" drop column "is_active";

alter table "public"."products" drop column "display_order";

alter table "public"."products" drop column "is_available";

alter table "public"."products" drop column "is_popular";


